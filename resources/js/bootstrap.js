import axios from 'axios';

window.axios = axios;
axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

const token = localStorage.getItem('mizan_auth_token');
if (token) {
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// إرفاق رمز الدخول تلقائياً مع كل استدعاء
axios.interceptors.request.use((config) => {
    const currentToken = localStorage.getItem('mizan_auth_token');
    if (currentToken) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${currentToken}`;
    }
    return config;
});

// التعامل مع انتهاء صلاحية الجلسة أو الحظر
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        // لا نقوم بالخروج التلقائي إذا كان الخطأ قادماً من محاولة تسجيل الدخول الخاطئة
        if (
            error.response &&
            error.response.status === 401 &&
            !error.config?.url?.includes('/auth/login')
        ) {
            localStorage.removeItem('mizan_auth_token');
            delete axios.defaults.headers.common['Authorization'];
            window.dispatchEvent(new Event('mizan_auth_logout'));
        }
        return Promise.reject(error);
    }
);
