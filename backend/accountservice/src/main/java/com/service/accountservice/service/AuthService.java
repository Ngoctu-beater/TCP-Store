package com.service.accountservice.service;

import com.service.accountservice.dto.AuthResponse;
import com.service.accountservice.dto.LoginRequest;
import com.service.accountservice.dto.RegisterRequest;
import com.service.accountservice.model.Role;
import com.service.accountservice.model.User;
import com.service.accountservice.repository.RoleRepository;
import com.service.accountservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final EmailService emailService;

    // Đăng ký tài khoản (Chưa kích hoạt, chờ xác thực OTP)
    public AuthResponse register(RegisterRequest request) {
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new RuntimeException("Email không được để trống!");
        }
        if (request.getPhoneNumber() == null || request.getPhoneNumber().trim().isEmpty()) {
            throw new RuntimeException("Số điện thoại không được để trống!");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new RuntimeException("Mật khẩu phải có ít nhất 6 ký tự!");
        }

        String emailRegex = "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$";
        if (!request.getEmail().matches(emailRegex)) {
            throw new RuntimeException("Định dạng email không hợp lệ!");
        }

        String phoneRegex = "^(0[3|5|7|8|9])+([0-9]{8})$";
        if (!request.getPhoneNumber().matches(phoneRegex)) {
            throw new RuntimeException("Số điện thoại không hợp lệ (Phải là số Việt Nam 10 chữ số)!");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email này đã được sử dụng!");
        }

        Role userRole = roleRepository.findByRoleName("USER")
                .orElseThrow(() -> new RuntimeException("Lỗi hệ thống: Không tìm thấy Role 'USER'"));

        // Tạo mã OTP 6 số ngẫu nhiên
        String otp = String.format("%06d", new Random().nextInt(999999));

        User user = User.builder()
                .email(request.getEmail())
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .password(passwordEncoder.encode(request.getPassword()))
                .isActive(true)
                .isVerified(false) // Mặc định là false cho đến khi nhập đúng OTP
                .verificationCode(otp)
                .codeExpiry(LocalDateTime.now().plusMinutes(5)) // Hiệu lực 5 phút
                .build();

        user.addRole(userRole);
        userRepository.save(user);

        // Gửi email xác thực
        emailService.sendEmail(user.getEmail(), "Mã xác nhận đăng ký TCP Store",
                "<h3>Chào mừng bạn đến với TCP Store!</h3>" +
                        "<p>Mã xác nhận đăng ký của bạn là: <b><span style=\"font-size:20px; color:blue;\">" + otp + "</span></b></p>" +
                        "<p>Mã này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>");

        // Trả về AuthResponse với token null, client sẽ dựa vào message để hiển thị form nhập OTP
        return new AuthResponse(null, "Vui lòng kiểm tra email để lấy mã xác thực.");
    }

    // Xác thực mã OTP để hoàn tất đăng ký và cấp JWT
    public AuthResponse verifyRegister(String email, String code) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy User!"));

        if (user.getVerificationCode() != null
                && user.getVerificationCode().equals(code)
                && user.getCodeExpiry().isAfter(LocalDateTime.now())) {

            user.setVerified(true);
            user.setVerificationCode(null); // Xóa mã sau khi dùng
            userRepository.save(user);

            String roleName = user.getRoles().isEmpty() ? "USER" : user.getRoles().iterator().next().getRoleName();
            String token = jwtService.generateToken(user, roleName);

            return new AuthResponse(token, "Xác thực thành công!");
        }

        throw new RuntimeException("Mã xác thực không đúng hoặc đã hết hạn.");
    }

    // Đăng nhập
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu không chính xác!");
        }

        // Kiểm tra xem đã xác thực email chưa
        if (!user.isVerified()) {
            throw new RuntimeException("Tài khoản chưa được xác thực email. Vui lòng kiểm tra hòm thư của bạn!");
        }

        if (!user.isEnabled()) {
            throw new RuntimeException("Tài khoản đã bị khóa. Vui lòng liên hệ Admin!");
        }

        String roleName = user.getRoles().isEmpty() ? "USER" : user.getRoles().iterator().next().getRoleName();
        String token = jwtService.generateToken(user, roleName);

        return new AuthResponse(token, "Đăng nhập thành công");
    }

    // Quên mật khẩu - Tạo mã OTP và gửi Mail
    public String forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại trên hệ thống!"));

        String otp = String.format("%06d", new Random().nextInt(999999));
        user.setResetPasswordCode(otp);
        user.setCodeExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        emailService.sendEmail(email, "Yêu cầu khôi phục mật khẩu TCP Store",
                "<h3>Yêu cầu lấy lại mật khẩu</h3>" +
                        "<p>Mã khôi phục mật khẩu của bạn là: <b><span style=\"font-size:20px; color:red;\">" + otp + "</span></b></p>" +
                        "<p>Mã này có hiệu lực trong vòng 15 phút. Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>");

        return "Mã khôi phục đã được gửi vào email của bạn.";
    }

    // Đặt lại mật khẩu mới
    public String resetPassword(String email, String code, String newPassword) {
        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException("Mật khẩu mới phải có ít nhất 6 ký tự!");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Email không tồn tại!"));

        if (user.getResetPasswordCode() != null
                && user.getResetPasswordCode().equals(code)
                && user.getCodeExpiry().isAfter(LocalDateTime.now())) {

            user.setPassword(passwordEncoder.encode(newPassword));
            user.setResetPasswordCode(null); // Xóa mã sau khi dùng
            userRepository.save(user);

            return "Đổi mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.";
        }

        throw new RuntimeException("Mã xác nhận không đúng hoặc đã hết hạn.");
    }
}