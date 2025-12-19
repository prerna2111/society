export class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  async request(path, { method = 'GET', body, headers = {}, params } = {}) {
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const search = new URLSearchParams(params);
      url += `?${search.toString()}`;
    }

    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials: 'include',
    };

    if (this.token) {
      fetchOptions.headers.Authorization = `Bearer ${this.token}`;
    }

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    const contentType = response.headers.get('Content-Type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message = isJson ? data.message : response.statusText;
      throw new Error(message || 'Request failed');
    }

    return data;
  }
}

const apiClient = new ApiClient(import.meta.env.VITE_API_URL || 'http://localhost:4000/api');

export default apiClient;

