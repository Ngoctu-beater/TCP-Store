package com.service.accountservice.controller;

import com.service.accountservice.dto.AuthResponse;
import com.service.accountservice.dto.LoginRequest;
import com.service.accountservice.dto.RegisterRequest;
import com.service.accountservice.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    // Xác thực đăng ký
    @PostMapping("/verify-register")
    public ResponseEntity<?> verify(@RequestParam String email, @RequestParam String code) {
        return ResponseEntity.ok(authService.verifyRegister(email, code));
    }

    // Khôi phục mật khẩu
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgot(@RequestParam String email) {
        return ResponseEntity.ok(authService.forgotPassword(email));
    }

    // Đặt lại mật khẩu
    @PostMapping("/reset-password")
    public ResponseEntity<?> reset(@RequestBody Map<String, String> req) {
        return ResponseEntity.ok(authService.resetPassword(req.get("email"), req.get("code"), req.get("password")));
    }
}