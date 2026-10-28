export const WORKSPACE_MESSAGES = {
  vi: {
    'train.compute.new': 'Thuê GPU mới', 'train.compute.existing': 'Dùng GPU đã thuê',
    'train.compute.pick': 'Chọn GPU đang chạy', 'train.compute.none': 'Chưa có GPU đang chạy sẵn sàng.',
    'train.compute.reuseNote': 'Dùng phiên thuê hiện tại, không tạo thêm máy. Dữ liệu train lưu ở /workspace/training. Hủy job sẽ dừng GPU này.',
    'train.storage.title': 'Lưu trữ khi train', 'train.storage.local': 'Ổ của máy GPU (mất khi xóa máy)',
    'train.storage.create': 'Tạo ổ network', 'train.storage.size': 'Dung lượng (GB)', 'train.storage.dc': 'Trung tâm dữ liệu',
    'train.storage.name': 'Tên ổ', 'train.storage.note': 'Ổ network giữ dữ liệu khi xóa GPU và tiếp tục tính phí đến khi bạn xóa ổ. GPU mới phải ở cùng trung tâm dữ liệu.',
    'train.storage.existing': 'GPU đang thuê dùng ổ đã gắn sẵn; không thể gắn thêm ổ network khi máy đang chạy.',
    'train.storage.month': '/tháng', 'train.storage.createDone': 'Đã tạo ổ network. Chọn GPU mới để gắn ổ và bắt đầu train.',
  },
  en: {
    'train.compute.new': 'Rent a new GPU', 'train.compute.existing': 'Use a rented GPU',
    'train.compute.pick': 'Choose a running GPU', 'train.compute.none': 'No running GPU is ready yet.',
    'train.compute.reuseNote': 'Uses your current rental without creating another machine. Training data is saved in /workspace/training. Cancelling the job stops this GPU.',
    'train.storage.title': 'Training storage', 'train.storage.local': 'GPU disk (deleted with the machine)',
    'train.storage.create': 'Create network volume', 'train.storage.size': 'Size (GB)', 'train.storage.dc': 'Data center',
    'train.storage.name': 'Volume name', 'train.storage.note': 'A network volume keeps data after GPU deletion and is billed until you delete it. New GPUs must use the same data center.',
    'train.storage.existing': 'Your rented GPU uses its current storage; a network volume cannot be added while it is running.',
    'train.storage.month': '/month', 'train.storage.createDone': 'Network volume created. Select a new GPU to attach it and start training.',
  },
};
