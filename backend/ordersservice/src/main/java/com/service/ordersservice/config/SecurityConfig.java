package com.service.ordersservice.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

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
                // Tắt CORS hoàn toàn tại Service này (Nhường quyền cho API Gateway)
                .cors(cors -> cors.disable())

                // Tắt CSRF (Bắt buộc khi sử dụng Token JWT)
                .csrf(csrf -> csrf.disable())

                // Phân quyền các đường dẫn cơ bản
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/orders/**").permitAll()
                        .requestMatchers("/api/vouchers/**").permitAll()
                        .requestMatchers("/api/payment/payos/**").permitAll() // Mở toàn bộ prefix /payos/
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated()
                )

                //  Không lưu trạng thái phiên làm việc (Stateless)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Giữ nguyên bộ lọc JWT để xác thực lại Token do Gateway gửi xuống (Nguyên tắc Zero Trust)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
