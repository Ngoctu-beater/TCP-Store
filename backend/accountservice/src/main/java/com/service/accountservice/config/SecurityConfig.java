package com.service.accountservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {
    private final JwtAuthenticationFilter jwtAuthFilter;
    private final AuthenticationProvider authenticationProvider;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter, AuthenticationProvider authenticationProvider) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.authenticationProvider = authenticationProvider;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Tắt CORS hoàn toàn tại Service này (Nhường quyền cho API Gateway)
                .cors(cors -> cors.disable())

                // Tắt CSRF (Bắt buộc khi sử dụng Token JWT)
                .csrf(csrf -> csrf.disable())

                // Phân quyền các đường dẫn cơ bản
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll() // Mở cho đăng ký, đăng nhập, quên mật khẩu...
                        .requestMatchers("/uploads/**").permitAll()  // Mở cho việc xem ảnh avatar
                        .anyRequest().authenticated()                // Tất cả các API còn lại phải có Token
                )

                //  Không lưu trạng thái phiên làm việc (Stateless)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .authenticationProvider(authenticationProvider)

                // Giữ nguyên bộ lọc JWT để xác thực lại Token do Gateway gửi xuống (Nguyên tắc Zero Trust)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}