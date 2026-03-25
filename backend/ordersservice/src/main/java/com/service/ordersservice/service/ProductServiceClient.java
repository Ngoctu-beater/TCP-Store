package com.service.ordersservice.service;

import com.service.ordersservice.dto.ProductCategoryInfoResponse;
import com.service.ordersservice.dto.ProductResponse;
import com.service.ordersservice.dto.StockUpdateRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.Collections;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ProductServiceClient {
    private final RestTemplate restTemplate;

    @Value("${product.service.url:http://localhost:8082/api/products}")
    private String productServiceUrl;

    // Giảm lượng hàng tồn kho
    public void decreaseStock(List<StockUpdateRequest> requests) {
        String url = productServiceUrl + "/stock/decrease";
        restTemplate.exchange(url, HttpMethod.PUT, createHttpEntity(requests), String.class);
    }

    // Tăng lượng hàng tồn kho
    public void increaseStock(List<StockUpdateRequest> requests) {
        String url = productServiceUrl + "/stock/increase";
        restTemplate.exchange(url, HttpMethod.PUT, createHttpEntity(requests), String.class);
    }

    // Tăng doanh số bán hàng
    public void increaseSold(List<StockUpdateRequest> requests) {
        String url = productServiceUrl + "/sold/increase";
        restTemplate.exchange(url, HttpMethod.PUT, createHttpEntity(requests), String.class);
    }

    private HttpEntity<List<StockUpdateRequest>> createHttpEntity(List<StockUpdateRequest> requests) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(requests, headers);
    }
    public ProductResponse getProductById(Integer productId) {
        String url = productServiceUrl + "/" + productId;
        try {
            return restTemplate.getForObject(url, ProductResponse.class);
        } catch (Exception e) {
            System.err.println("Lỗi khi lấy thông tin sản phẩm ID " + productId + ": " + e.getMessage());
            return null;
        }
    }

    public List<ProductCategoryInfoResponse> getCategoryInfoForProducts(List<Integer> productIds) {
        if (productIds == null || productIds.isEmpty()) return Collections.emptyList();

        String url = productServiceUrl + "/internal/category-info";
        try {
            ProductCategoryInfoResponse[] response = restTemplate.postForObject(url, productIds, ProductCategoryInfoResponse[].class);
            return response != null ? Arrays.asList(response) : Collections.emptyList();
        } catch (Exception e) {
            System.err.println("Lỗi khi lấy thông tin danh mục từ ProductService: " + e.getMessage());
            return Collections.emptyList();
        }
    }
}
