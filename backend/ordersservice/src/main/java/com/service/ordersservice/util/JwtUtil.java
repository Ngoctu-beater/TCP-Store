package com.service.ordersservice.util;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.security.Key;

@Component
public class JwtUtil {
    @Value("${jwt.secret}")
    private String secretKey;

    public Integer extractUserId(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }

        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(getSignKey())
                    .build()
                    .parseClaimsJws(token)
                    .getBody();

            // Trả về userId (Key "user_id" phải khớp với code bên AuthService)
            return claims.get("user_id", Integer.class);
        } catch (Exception e) {
            // Nếu token sai hoặc hết hạn -> trả về null hoặc ném lỗi
            System.err.println("Lỗi giải mã Token: " + e.getMessage());
            return null;
        }
    }

    private Key getSignKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
