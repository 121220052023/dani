import { useEffect } from 'react';
import useUiStore from '../../store/useUiStore';

export default function ToastViewport() {
  const { toasts, removeToast } = useUiStore();

  useEffect(() => {
    const timers = toasts.map((toast) => setTimeout(() => removeToast(toast.id), 3200));
    return () => timers.forEach(clearTimeout);
  }, [toasts, removeToast]);

  return (
    <div className="toast-viewport">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.tone}`}>
          {toast.message}
        </div>
      ))}
    </div>
  );
}
