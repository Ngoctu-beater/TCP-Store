package com.service.apigateway.filter;

import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.function.Predicate;

@Component
public class RouteValidator {
    // API công khai (Cho phép cả GET và POST)
    public static final List<String> openApiEndpoints = List.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/verify-register",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/chat",
            "/api/vouchers/public/active",
            "/api/vouchers/validate",
            "/api/payment/payos"
    );

    public static final List<String> openGetEndpoints = List.of(
            "/api/categories",
            "/api/products"
    );

    public Predicate<ServerHttpRequest> isSecured = request -> {
        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        // 1. Kiểm tra danh sách API luôn công khai
        boolean isOpenApi = openApiEndpoints.stream().anyMatch(path::contains);
        if (isOpenApi) return false;

        // 2. Chặn các API nội bộ/quản trị
        if (path.contains("/admin") || path.contains("/internal")) return true;

        // 3. Kiểm tra các API công khai chỉ với phương thức GET
        boolean isOpenGetApi = openGetEndpoints.stream().anyMatch(path::startsWith);
        if (isOpenGetApi && HttpMethod.GET.equals(method)) return false;

        return true;
    };
}