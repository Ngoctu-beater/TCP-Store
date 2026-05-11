package com.service.apigateway.filter;

import org.springframework.http.HttpMethod;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Predicate;

@Component
public class RouteValidator {
    // API luôn luôn công khai (Không phân biệt GET/POST)
    public static final List<String> openApiEndpoints = List.of(
            "/api/auth/register",
            "/api/auth/login",
            "/api/auth/verify-register",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/chat"
//            "/api/vouchers/public/active",
//            "/api/vouchers/validate"
    );

    // Các prefix API công khai nếu phương thức là GET
    public static final List<String> openGetEndpoints = List.of(
            "/api/categories",
            "/api/products"
    );

    public Predicate<ServerHttpRequest> isSecured = request -> {
        String path = request.getURI().getPath();
        HttpMethod method = request.getMethod();

        // Cho phép các API công khai đi qua
        boolean isOpenApi = openApiEndpoints.stream().anyMatch(path::contains);
        if (isOpenApi) {
            return false;
        }

        // Các API hệ thống và quản trị bắt buộc phải có Token
        if (path.contains("/admin") || path.contains("/internal") || path.contains("/stock") || path.contains("/sold")) {
            return true;
        }

        // Cho phép khách vãng lai xem danh sách sản phẩm, danh mục, và đánh giá
        boolean isOpenGetApi = openGetEndpoints.stream().anyMatch(path::startsWith);
        if (isOpenGetApi && HttpMethod.GET.equals(method)) {
            return false;
        }

        return true;
    };
}
