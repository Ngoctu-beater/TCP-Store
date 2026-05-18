package com.service.productservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
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

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // TẮT CẤU HÌNH CORS TẠI ĐÂY (Nhường quyền cho API Gateway)
                .cors(cors -> cors.disable())

                // Tắt CSRF (Bắt buộc khi sử dụng JWT)
                .csrf(csrf -> csrf.disable())

                // Phân quyền cơ bản cho các luồng dữ liệu
                .authorizeHttpRequests(auth -> auth
                        // Các API công khai (Khớp với RouteValidator bên Gateway)
                        .requestMatchers("/api/categories/**").permitAll()
                        .requestMatchers("/api/products/**").permitAll()
                        .requestMatchers("/api/chat/**").permitAll()
                        .requestMatchers("/error").permitAll()

                        // Các API còn lại bắt buộc phải xác thực
                        .anyRequest().authenticated()
                )

                // Cấu hình Stateless (Không lưu trữ Session)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}
