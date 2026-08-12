---
description: Tự động tạo và cập nhật 1 file báo cáo research duy nhất mỗi session, thêm vào mỗi khi có research mới
---

# Auto Research Report — 1 File Per Session

// turbo-all

## Nguyên tắc cốt lõi

Mỗi conversation session (hoặc mỗi task lớn) chỉ có **MỘT file report duy nhất**:
- **Tên file linh hoạt & có ý nghĩa:** Đặt tên file phản ánh nội dung chính của session. **Không đặt tên chung chung.**
- **Vị trí lưu linh hoạt:**
    - Nếu brainstorm/research liên quan đến **.agents** (skills, workflows, agent setup) → Lưu tại `.agents/reports/`.
    - Nếu brainstorm/research liên quan đến **source code / project** (apps, packages, business logic) → Lưu tại `reports/` ở root.

- **Quy trình Review:** Luôn tạo bản thảo report (dưới dạng artifact hoặc đoạn chat) và yêu cầu người dùng review trước khi thực hiện ghi/cập nhật file thật.

Mục tiêu: File này là "nhật ký" tổng hợp toàn bộ những gì đã trao đổi & research trong session, giúp theo dõi tiến trình liên tục.

---

## Quy trình

### Bước 1: Xác định Vị trí và Tên File
- Dựa vào ngữ cảnh (Agents hay Source code) để chọn thư mục phù hợp (`.agents/reports/` hoặc `reports/`).
- Xác định một tên file có ý nghĩa (ví dụ: `forgot-password-feature-brainstorm-report.md`).
- Kiểm tra xem file đã tồn tại chưa để quyết định tạo mới hay append.

### Bước 2: Thực hiện Research & Soạn thảo Report
Hoàn thành quá trình research (thông qua scout, search_web, read_url_content, phân tích code...).
Dựa trên kết quả, soạn thảo nội dung report theo cấu trúc mẫu bên dưới.

### Bước 3: Review trước khi Lưu
**QUAN TRỌNG:** Phải trình bày nội dung report cho người dùng xem trước.
- Có thể dùng một artifact tạm thời (ví dụ: `report_draft.md`) hoặc hiển thị trực tiếp trong phản hồi.
- Hỏi: "Tôi đã soạn xong report cho phần research này, bạn có muốn tôi lưu/cập nhật nó vào `<path/to/report>` không?"

### Bước 4: Lưu/Cập nhật File Report (Sau khi đã được duyệt)

#### Nếu TẠO MỚI (lần đầu):
Dùng `write_to_file` với `Overwrite: false`:

```markdown
# Session Research Report
**Conversation ID:** <conversation-id>  
**Ngày bắt đầu:** YYYY-MM-DD  
**Mục tiêu session:** [Mô tả ngắn mục tiêu chính của session này]

---

## [Research #1] — HH:MM — <Chủ đề>

### Câu hỏi / Yêu cầu
[Người dùng hỏi / yêu cầu gì]

### Các nguồn đã khảo sát
- [URL / file / resource đã đọc]

### Phát hiện chính
- [Những điểm quan trọng tìm được]

### Quyết định / Hành động
[Kết luận và bước tiếp theo]

---
```

#### Nếu CẬP NHẬT (lần tiếp theo):
Dùng `multi_replace_file_content` để **append** section mới vào cuối file.

### Bước 5: Thông báo ngắn gọn
Sau khi cập nhật xong, thông báo ngắn:
> 📝 Session report đã được cập nhật (Research #N: <chủ đề>)

---

## Lưu ý quan trọng
- **Không bao giờ** tạo file report mới trong cùng 1 conversation cho cùng 1 task.
- Số thứ tự `#N` tăng dần.
- Thời gian dùng định dạng `HH:MM` theo giờ địa phương.
- Luôn ghi lại **Quyết định / Hành động** để dễ trace back sau này.
