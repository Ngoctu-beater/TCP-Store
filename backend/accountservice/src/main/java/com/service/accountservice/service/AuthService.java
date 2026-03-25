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

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    // Đăng ký
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

        User user = User.builder()
                .email(request.getEmail())
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .password(passwordEncoder.encode(request.getPassword()))
                .isActive(true)
                .build();

        user.addRole(userRole);
        userRepository.save(user);

        String token = jwtService.generateToken(user, "USER");
        return new AuthResponse(token, "Đăng ký thành công");
    }

    // Đăng nhập
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Tài khoản không tồn tại!"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Mật khẩu không chính xác!");
        }

        if (!user.isEnabled()) {
            throw new RuntimeException("Tài khoản đã bị khóa. Vui lòng liên hệ Admin!");
        }

        String roleName = user.getRoles().isEmpty() ? "USER" : user.getRoles().iterator().next().getRoleName();
        String token = jwtService.generateToken(user, roleName);

        return new AuthResponse(token, "Đăng nhập thành công");
    }
}
