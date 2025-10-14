import { httpClient } from './httpClient.js';

function normalisePost(post) {
  if (!post) return null;
  return {
    ...post,
    viewCount: Number(post.viewCount ?? 0),
    readingTimeMinutes: Number(post.readingTimeMinutes ?? post.reading_time_minutes ?? 0),
    publishedAt: post.publishedAt ?? post.published_at ?? null,
    tags: Array.isArray(post.tags) ? post.tags : [],
    media: Array.isArray(post.media) ? post.media : []
  };
}

export async function fetchBlogPosts({ page = 1, pageSize = 12, category, tags = [], search } = {}) {
  const params = { page, pageSize };
  if (category) params.category = category;
  if (search) params.search = search;
  if (Array.isArray(tags) && tags.length) {
    params.tags = tags.join(',');
  }
  const response = await httpClient.get('/blog/posts', { params });
  const posts = Array.isArray(response.data) ? response.data.map(normalisePost) : [];
  return {
    posts,
    pagination: response.meta?.pagination ?? { page: 1, pageSize: posts.length, total: posts.length, totalPages: 1 },
    meta: response.meta ?? {}
  };
}

export async function fetchBlogPost(slug) {
  if (!slug) throw new Error('Blog slug is required');
  const response = await httpClient.get(`/blog/posts/${slug}`);
  return normalisePost(response.data);
}

export async function fetchBlogCategories() {
  const response = await httpClient.get('/blog/categories');
  return Array.isArray(response.data) ? response.data : [];
}

export async function fetchBlogTags() {
  const response = await httpClient.get('/blog/tags');
  return Array.isArray(response.data) ? response.data : [];
}

export async function adminListBlogPosts({ token, page = 1, pageSize = 20, status, search, category, tags = [] } = {}) {
  if (!token) throw new Error('Authentication token required');
  const params = { page, pageSize };
  if (status) params.status = status;
  if (search) params.search = search;
  if (category) params.category = category;
  if (tags.length) params.tags = tags.join(',');
  const response = await httpClient.get('/admin/blog/posts', { token, params });
  const posts = Array.isArray(response.data) ? response.data.map(normalisePost) : [];
  return {
    posts,
    pagination: response.meta?.pagination ?? { page, pageSize, total: posts.length, totalPages: 1 },
    meta: response.meta ?? {}
  };
}

export async function adminCreateBlogPost(payload, { token } = {}) {
  if (!token) throw new Error('Authentication token required');
  const response = await httpClient.post('/admin/blog/posts', payload, { token });
  return normalisePost(response.data);
}

export async function adminUpdateBlogPost(postId, payload, { token } = {}) {
  if (!token) throw new Error('Authentication token required');
  if (!postId) throw new Error('Blog post id required');
  const response = await httpClient.patch(`/admin/blog/posts/${postId}`, payload, { token });
  return normalisePost(response.data);
}

export const blogApi = {
  fetchBlogPosts,
  fetchBlogPost,
  fetchBlogCategories,
  fetchBlogTags,
  adminListBlogPosts,
  adminCreateBlogPost,
  adminUpdateBlogPost
};

export default blogApi;
