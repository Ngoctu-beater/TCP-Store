**TuComputer Store - Hệ thống Thương mại Điện tử Microservices**

TuComputer Store là một dự án website bán thiết bị điện tử thông minh, được xây dựng trên kiến trúc Microservices hiện đại, đảm bảo khả năng mở rộng và hiệu năng cao.

🚀 Kiến trúc Hệ thống

Hệ thống bao gồm 4 dịch vụ cốt lõi và một giao diện người dùng:

1. Backend (Spring Boot)

- Account Service: Quản lý người dùng, xác thực JWT, phân quyền (Admin/User) và thông tin cá nhân.

- Product Service: Quản lý danh mục, sản phẩm, kho hàng, hình ảnh và đánh giá.

- Shopping Cart Service: Xử lý giỏ hàng tạm thời và tích hợp dữ liệu sản phẩm.

- Orders Service: Quản lý quy trình đặt hàng, trạng thái thanh toán và thống kê doanh thu.

2. Frontend (HTML/JS/Tailwind CSS)

- Giao diện được thiết kế Responsive với Tailwind CSS.

- Xử lý logic bằng JavaScript và giao tiếp với Backend qua REST API.

- Quản lý trạng thái đăng nhập và giỏ hàng thông qua JWT.

✨ Tính năng chính

- Đối với Khách hàng:
  
  + Xem sản phẩm: Duyệt sản phẩm theo danh mục, tìm kiếm và xem chi tiết hiệu năng.
    
  + Quản lý giỏ hàng: Thêm/sửa/xóa sản phẩm trong giỏ.
  
  + Địa chỉ nhận hàng: Thêm mới, chỉnh sửa và thiết lập địa chỉ mặc định.
    
  + Đặt hàng: Quy trình đặt hàng nhanh chóng với thông tin vận chuyển chính xác.

- Đối với Quản trị viên (Admin):
  
  + Dashboard: Thống kê doanh thu, số lượng đơn hàng và người dùng mới.
    
  + Quản lý sản phẩm & danh mục: Thêm mới sản phẩm, cập nhật tồn kho và hình ảnh.
    
  + Quản lý khách hàng: Theo dõi danh sách và trạng thái hoạt động của người dùng.

🛠 Công nghệ sử dụng

- Backend: Java 17+, Spring Boot 3.x, Spring Data JPA, Spring Security, JWT.
  
- Database: MySQL.
  
- Frontend: HTML5, Tailwind CSS, JavaScript.
