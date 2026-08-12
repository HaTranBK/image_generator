# Skills Directory

Thư mục này chứa các **skills** — bộ hướng dẫn mở rộng khả năng của AI cho các tác vụ chuyên biệt.

## Cấu trúc mỗi skill

```
skills/
└── <skill-name>/
    ├── SKILL.md          # (bắt buộc) Hướng dẫn chính với YAML frontmatter
    ├── scripts/          # (tuỳ chọn) Helper scripts
    ├── examples/         # (tuỳ chọn) Ví dụ tham khảo
    └── resources/        # (tuỳ chọn) File/template bổ sung
```

## Format SKILL.md

```markdown
---
name: tên-skill
description: Mô tả ngắn skill này làm gì và khi nào dùng
---

# Tên Skill

## Mục đích
...

## Hướng dẫn sử dụng
...
```

## Skills hiện có

| Skill | Mô tả |
|-------|-------|
| `example-skill` | Skill mẫu để tham khảo cách viết |

## Thêm skill mới

1. Tạo folder mới trong `skills/`
2. Tạo file `SKILL.md` với YAML frontmatter
3. Thêm vào bảng danh sách bên trên
