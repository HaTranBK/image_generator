# Hướng dẫn Cấu trúc Thư mục Component và Pages (Routes) trong Dự án AVA Logistics

Dự án **AVA Logistics** (`ava_nextjs`) được tổ chức theo kiến trúc phân tách rõ rệt giữa **Routing/Orchestration Layer** (ở thư mục `src/pages`) và **View/UI Component Layer** (ở thư mục `src/components`). 

Cấu trúc này giúp mã nguồn sạch sẽ, tách biệt logic phân quyền & gọi API (ở tầng Page) khỏi giao diện hiển thị (ở tầng Component), đồng thời tối ưu hóa việc tái sử dụng code.

---

## 1. Cấu trúc Tổng quan thư mục `src/components`

Thư mục `src/components` chứa toàn bộ giao diện và logic UI hiển thị của ứng dụng, được chia làm các thư mục con sau:

```text
src/components/
├── assets/             # Chứa các tài nguyên tĩnh như hình ảnh, icons nội bộ
├── client/             # Chứa component render thuần phía Client (mặc định có file .keep)
├── layout/             # Định nghĩa khung giao diện chính (Bố cục layout lớn)
│   ├── EmptyLayout/    # Layout trống (thường dùng cho trang login, error)
│   └── MainLayout/     # Layout đầy đủ (bao gồm Sidebar, Header, Footer)
├── pages/              # [QUAN TRỌNG] Các component hiển thị chính của từng trang cụ thể
│   ├── customer/       # Phân hệ Danh sách Customer (camelCase)
│   │   ├── CustomerSearchForm/  # Form tìm kiếm khách hàng (PascalCase)
│   │   ├── CustomerTable/       # Bảng hiển thị thông tin
│   │   ├── ListCustomerTable/   # Component hiển thị danh sách
│   │   ├── hooks/               # Custom hooks chỉ dùng riêng cho trang customer
│   │   ├── context.ts           # React Context dùng chung nội bộ trang customer
│   │   └── types.ts             # Định nghĩa kiểu dữ liệu riêng của trang customer
│   ├── createCustomer/ # Phân hệ Tạo mới Customer
│   │   ├── CreateCustomerForm/
│   │   │   ├── basicInfo/       # Khối thông tin cơ bản
│   │   │   ├── billingInfo/     # Khối thông tin thanh toán/hóa đơn
│   │   │   ├── index.tsx        # File export form chính
│   │   │   ├── types.ts         # Types riêng của Form
│   │   │   └── validation.ts    # Schema validation (như Yup/Zod)
│   │   └── types.ts             # Types ở cấp độ trang createCustomer
├── server/             # Chứa component render phía Server (mặc định có file .keep)
└── shared/             # Các Component UI nguyên tử, dùng chung toàn hệ thống
    ├── alert/          # Component thông báo lỗi, cảnh báo (ví dụ: PermissionAlert.tsx)
    ├── card/           # Các khung thẻ card
    ├── formControl/    # Các thẻ input, select được bao bọc (wrapped) để dùng với Formik/Hook Form
    ├── loading/        # Trạng thái chờ (ví dụ: FullScreenLoading.tsx)
    ├── modal/          # Các popup modal dùng chung
    └── tooltip/        # Gợi ý thông tin khi di chuột
```

---

## 2. Mối quan hệ giữa `src/pages` và `src/components/pages`

Trong Next.js Pages Router:
*   **`src/pages` (Routing & Orchestration)**: Đóng vai trò như các **Controller**. Các file tại đây định nghĩa URL của trang. Chúng không chứa nhiều code giao diện (HTML/CSS) mà tập trung xử lý:
    *   Cấu hình Layout (`Page.Layout = MainLayout`).
    *   Quản lý Tiêu đề & SEO (`Head` title).
    *   Tải dữ liệu đa ngôn ngữ ở server (`getStaticProps` / `serverSideTranslations`).
    *   Xử lý kiểm tra quyền truy cập (Ví dụ: `isAllowPermission` lấy từ redux store).
    *   Đăng ký callback gọi API (lấy từ thư mục `services/api`) và hiển thị loading/toast.
    *   Điều hướng Router (`router.push`).
*   **`src/components/pages` (Giao diện hiển thị - View)**: Đóng vai trò như các **View**. Chúng chỉ nhận dữ liệu, hàm xử lý từ `src/pages` qua **Props** hoặc qua **Context nội bộ**, chịu trách nhiệm render giao diện và tương tác với người dùng.

### Ví dụ minh họa thực tế (`src/pages/customer/create.tsx` kết nối với `src/components/pages/createCustomer`)

1.  **Tại tầng Page (`src/pages/customer/create.tsx`)**:
    *   Nhận nhiệm vụ kiểm tra quyền `REGISTER_CUSTOMER`.
    *   Định nghĩa hàm submit gọi API `createCustomerTS` và điều hướng trang.
    *   Hiển thị `<PermissionAlert />` nếu không có quyền, hoặc `<FullScreenLoading />` nếu đang gọi API.
    *   Render Component Form chính từ thư mục components:
        ```tsx
        import CreateCustomerForm from '@/components/pages/createCustomer/CreateCustomerForm';
        
        // ... (Logic kiểm tra quyền & submit) ...
        
        return (
          <Paper sx={{ py: 3 }}>
            {!isAllowPermission ? (
              <PermissionAlert sx={{ marginTop: 2 }} />
            ) : (
              <CreateCustomerForm
                handleCreateCustomerSubmit={handleCreateCustomerSubmit}
              />
            )}
          </Paper>
        );
        ```

2.  **Tại tầng Component (`src/components/pages/createCustomer/CreateCustomerForm/index.tsx`)**:
    *   Tập trung xây dựng giao diện form gồm các khối `basicInfo` và `billingInfo`.
    *   Xử lý validate dữ liệu nhập vào dựa trên schema định nghĩa trong file `validation.ts`.
    *   Sau khi form validate thành công, gọi callback `handleCreateCustomerSubmit(values)` nhận từ props để đẩy data lên cho tầng Page xử lý API.

---

## 3. Quy tắc Tách Component và Cấu trúc Thư mục trang (Component Extraction Rule)

Để tránh tình trạng một file giao diện của trang chứa quá nhiều dòng code (hơn 150-200 dòng) gây khó khăn cho việc bảo trì và đọc hiểu, dự án áp dụng quy chuẩn tách nhỏ các thành phần giao diện (Filter, Table, Modal...) thành các file/thư mục riêng biệt.

### 3.1 Quy tắc khi nào cần tách Component
*   **Kích thước file quá lớn**: Khi file component/page vượt quá **150 - 200 dòng code**.
*   **Logic/State độc lập**: Một khối giao diện có state riêng biệt rõ rệt (ví dụ: Form Filter có state quản lý các ô input; Modal popup có state đóng/mở và xử lý data submit; Table có state xử lý lựa chọn dòng...).
*   **Mục đích đọc hiểu & Bảo trì**: Tách nhỏ giúp chia nhỏ file chính thành một bản thiết kế tổng quát (Layout orchestrator) giúp lập trình viên khác nhìn vào biết ngay cấu trúc trang gồm những gì mà không bị rối bởi logic chi tiết.

### 3.2 Quy trình và Cấu trúc Thư mục trang trong `src/components/pages/[featureName]`

Khi phát triển một trang mới (ví dụ: `order`), ta không viết tất cả trong một file mà thực hiện:
1. Tạo thư mục trang viết theo dạng `camelCase` trong `src/components/pages/` (ví dụ: `src/components/pages/order`).
2. Tách các thành phần giao diện nhỏ như Filter, Table, Modal... thành từng **thư mục con** riêng biệt viết theo dạng `PascalCase`.
3. Mỗi thư mục con sẽ có file chạy chính là `index.tsx` và có thể chứa các file bổ trợ riêng cho component đó (như `types.ts`, `styles.ts`).

Cấu trúc chuẩn như sau:

```text
src/components/pages/order/           # Folder chứa toàn bộ UI của trang Order (camelCase)
├── OrderFilter/                      # Folder của Component Bộ lọc (PascalCase)
│   ├── index.tsx                     # Code giao diện chính của bộ lọc
│   └── types.ts                      # Kiểu dữ liệu (interface/props) riêng của bộ lọc
├── OrderTable/                       # Folder của Component Bảng hiển thị (PascalCase)
│   ├── index.tsx                     # Code bảng hiển thị dữ liệu
│   └── types.ts                      # Kiểu dữ liệu / Columns config riêng của bảng
├── OrderDetailModal/                 # Folder của Popup chi tiết (PascalCase)
│   ├── index.tsx                     # Giao diện modal chi tiết
│   └── types.ts                      # Props / Form values của modal
├── hooks/                            # Folder chứa Custom Hooks chỉ dùng cho trang này
│   └── useOrderList.ts               # Hook xử lý logic query, pagination, filter
├── context.ts                        # (Tùy chọn) React Context dùng chung giữa các component con
└── types.ts                          # Định nghĩa types dùng chung cho toàn bộ trang
```

### 3.3 Cách thức tổ chức Props và Data Flow giữa các component con
*   **Component Cha (Orchestrator)** hoặc **Tầng Page (`src/pages/[feature]/index.tsx`)**: Đóng vai trò là nơi gom dữ liệu và truyền props/callback xuống cho các component con.
*   **Component con (Ví dụ: `OrderTable`)**: Bắt buộc phải định nghĩa rõ ràng interface props nhận vào (ví dụ: `OrderTableProps`) trong file `types.ts` cùng thư mục hoặc trực tiếp trong `index.tsx`. Tránh việc gọi API hay thay đổi state global trực tiếp trong component con, hãy sử dụng các callback (ví dụ: `onEdit`, `onDelete`) được truyền từ cha xuống.
*   **Sử dụng Context**: Trong trường hợp có quá nhiều tầng components con hoặc tránh prop-drilling, sử dụng `context.ts` tại thư mục trang để chia sẻ trạng thái chung (như trạng thái mở rộng bộ lọc, params tìm kiếm hiện tại).

### 3.4 Quy chuẩn đặt tên
*   **Thư mục trang con trong `src/components/pages/`**: Bắt buộc là `camelCase` (ví dụ: `customer`, `createCustomer`, `orderDetail`).
*   **Thư mục Component con**: Bắt buộc là `PascalCase` và nên có tiền tố tên trang để tránh nhầm lẫn (ví dụ: `CustomerTable`, `CustomerSearchForm` thay vì đặt tên chung chung là `Table`, `Filter`).
*   **Tệp tin bên trong Component con**: `index.tsx` làm entrypoint chính của component. Các file bổ trợ là `types.ts`, `validation.ts`.
*   **Thư mục hooks**: Viết thường `hooks/`, bên trong là các file custom hooks viết dạng `camelCase` bắt đầu bằng `use` (ví dụ: `useCustomerList.ts`).

---

## 4. Các Quy tắc Phát triển Cần Tuân Thủ

- [ ] **Tách biệt Logic**: Tầng component không trực tiếp gọi API của Services (trừ các trường hợp đặc biệt như tự fetch auto-complete). Hãy truyền hàm submit hoặc callback từ trang (`src/pages`) xuống thông qua props.
- [ ] **Alias Import (`@/*`)**: Luôn sử dụng alias `@/` để import. Tránh dùng relative path dạng `../../components`.
  * *Đúng*: `import MainLayout from '@/components/layout/MainLayout';`
  * *Sai*: `import MainLayout from '../../../components/layout/MainLayout';`
- [ ] **Đồng bộ đặt tên**: Thư mục định tuyến URL trong `src/pages` viết dạng `kebab-case` (ví dụ: `customer-bussiness`). Thư mục component hiển thị trong `src/components/pages` viết dạng `camelCase` (ví dụ: `customerBussiness`).
- [ ] **Quản lý state**: 
  * Dùng **React State / Form State** cho các tương tác cô lập trong component.
  * Dùng **React Context** (`context.ts` ở thư mục trang) khi cần truyền trạng thái qua lại giữa Form, Table và SearchForm của cùng một trang.
  * Dùng **Zustand / Redux** (`src/store`) cho các dữ liệu toàn cục như thông tin User, Permissions, Token, Cấu hình hệ thống.
