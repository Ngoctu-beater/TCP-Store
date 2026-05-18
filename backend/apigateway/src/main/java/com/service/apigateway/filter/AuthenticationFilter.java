package com.service.apigateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;

@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {
    @Autowired
    private RouteValidator validator;

    @Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    private String secret;

    public AuthenticationFilter() {
        super(Config.class);
    }

    @Override
    public GatewayFilter apply(Config config) {
        return ((exchange, chain) -> {

            // Kiểm tra xem URL này có cần bảo vệ không
            if (validator.isSecured.test(exchange.getRequest())) {

                // Kiểm tra xem có Header Authorization không
                if (!exchange.getRequest().getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                    exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                    return exchange.getResponse().setComplete(); // Chặn và báo lỗi 401
                }

                // Trích xuất chuỗi Token
                String authHeader = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    authHeader = authHeader.substring(7);
                }

                try {
                    // Sử dụng Decoders.BASE64.decode
                    byte[] keyBytes = Decoders.BASE64.decode(secret);
                    SecretKey key = Keys.hmacShaKeyFor(keyBytes);

                    // Kiểm tra tính hợp lệ của Token
                    Jwts.parser()
                            .verifyWith(key)
                            .build()
                            .parseSignedClaims(authHeader);

                } catch (Exception e) {
                    System.out.println("Lỗi JWT: " + e.getMessage());
                    exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
                    return exchange.getResponse().setComplete();
                }
            }

            // Nếu mọi thứ hợp lệ, cho phép yêu cầu đi tiếp xuống Microservice
            return chain.filter(exchange);
        });
    }

    public static class Config {
        // Lớp rỗng dùng để tương thích với cấu trúc của Spring Cloud Gateway
    }
}
