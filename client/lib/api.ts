const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'http://localhost:5005'

export class ApiError extends Error {
  status: number
  body: any

  constructor(status: number, message: string, body?: any) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

class ApiClient {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
  }

  clearToken() {
    this.token = null
  }

  private async handleResponse(response: Response) {
    const contentType = response.headers.get('content-type') || ''
    let body: any = null

    try {
      if (contentType.includes('application/json')) {
        body = await response.json()
      } else if (
        contentType.includes('application/pdf') ||
        contentType.includes('application/octet-stream')
      ) {
        if (!response.ok) {
          const text = await response.text()
          throw new ApiError(response.status, text || 'Binary response error')
        }
        return await response.blob()
      } else {
        body = await response.text()
      }
    } catch (err) {
      console.error('❌ Failed to parse response', err)
      throw new ApiError(response.status, 'Invalid server response', null)
    }

    if (!response.ok) {
      const message =
        body?.message ||
        body?.error ||
        body?.detail ||
        `Request failed with status ${response.status}`

      if (process.env.NODE_ENV !== 'production') {
        console.error('❌ API ERROR', {
          url: response.url,
          status: response.status,
          body,
        })
      }

      throw new ApiError(response.status, message, body)
    }

    return body
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_URL}${endpoint}`

    const isFormData = options.body instanceof FormData

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }

    if (!isFormData && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    return this.handleResponse(response)
  }

  // AUTH
  login(councilId: string, password: string) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ councilId, password }),
    })
  }

  // ADMIN
  createUser(councilId: string, password: string, role: string) {
    return this.request('/api/admin/create-user', {
      method: 'POST',
      body: JSON.stringify({ councilId, password, role }),
    })
  }

  getUserStats() {
    return this.request('/api/admin/user-stats')
  }

  bulkCreateUsers(formData: FormData) {
    return this.request('/api/admin/bulk-create-users', {
      method: 'POST',
      body: formData,
    })
  }

  bulkCreateProfiles(formData: FormData) {
    return this.request('/api/admin/bulk-create-profiles', {
      method: 'POST',
      body: formData,
    })
  }

  getAttendanceReport(startDate: string, endDate: string, committee: string = 'all') {
    return this.request(
      `/api/admin/attendance-report?startDate=${startDate}&endDate=${endDate}&committee=${encodeURIComponent(committee)}`
    )
  }

  downloadAttendancePdf(startDate: string, endDate: string, committee: string = 'all') {
    return this.postRaw(
      `/api/admin/attendance-report/pdf?startDate=${startDate}&endDate=${endDate}&committee=${encodeURIComponent(committee)}`,
      { method: 'GET' }
    )
  }

  getLogs(type: string, filters?: any) {
    const params = new URLSearchParams({ type, ...filters })
    return this.request(`/api/admin/logs?${params.toString()}`)
  }

  downloadLogsPdf(type: string, filters?: any) {
    const params = new URLSearchParams({ type, ...filters })
    return this.postRaw(`/api/admin/logs/pdf?${params.toString()}`, {
      method: 'GET',
    })
  }

  // PROFILE
  createProfile(profileData: any, file?: File) {
    const formData = new FormData()
    Object.entries(profileData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value as any)
      }
    })
    if (file) {
      formData.append('memberPicture', file)
    }
    return this.request('/api/profiles/create', {
      method: 'POST',
      body: formData,
    })
  }

  updateProfile(profileData: any, file?: File) {
    const formData = new FormData()
    Object.entries(profileData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value as any)
      }
    })
    if (file) {
      formData.append('memberPicture', file)
    }
    return this.request('/api/profiles/update', {
      method: 'PUT',
      body: formData,
    })
  }

  getMyProfile() {
    return this.request('/api/profiles/my-profile')
  }

  // ATTENDANCE
  punchIn() {
    return this.request('/api/attendance/punch-in', { method: 'POST' })
  }

  punchOut() {
    return this.request('/api/attendance/punch-out', { method: 'POST' })
  }

  getMyAttendance() {
    return this.request('/api/attendance/my-attendance')
  }

  // REPORTS
  submitReport(formData: FormData) {
    return this.request('/api/reports/submit', {
      method: 'POST',
      body: formData,
    })
  }

  getMyReports() {
    return this.request('/api/reports/my-reports')
  }

  // LEAVES
  applyLeave(formData: FormData) {
    return this.request('/api/leaves/apply', {
      method: 'POST',
      body: formData,
    })
  }

  getMyLeaves() {
    return this.request('/api/leaves/my-leaves')
  }

  deleteLeave(leaveId: number) {
    return this.request(`/api/leaves/${leaveId}`, { method: 'DELETE' })
  }

  // GS ROUTES
  getGSDashboardSummary() {
    return this.request('/api/gs/dashboard/summary')
  }

  getAllCommitteesInsights() {
    return this.request('/api/gs/all-committees-insights')
  }

  getGSCommittees() {
    return this.request('/api/gs/committees')
  }

  getGSCommitteeAttendanceAnalytics(committee: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams({ committee, startDate: startDate || '', endDate: endDate || '' })
    return this.request(`/api/gs/committee/attendance-analytics?${params.toString()}`)
  }

  getGSCommitteeMembers(committee: string, startDate?: string, endDate?: string) {
    const params = new URLSearchParams({ committee, startDate: startDate || '', endDate: endDate || '' })
    return this.request(`/api/gs/committee/members?${params.toString()}`)
  }

  approveLeaveByGS(leaveId: number) {
    return this.request(`/api/gs/approve-leave/${leaveId}`, {
      method: 'PUT',
    })
  }

  // COMMITTEE HEAD ROUTES
  getCommitteeInsights(range?: 'weekly' | 'monthly') {
    const params = range ? `?range=${range}` : ''
    return this.request(`/api/head/committee-insights${params}`)
  }

  getHeadCommitteeMembers() {
    return this.request('/api/head/committee-members')
  }

  getCommitteeLeaves() {
    return this.request('/api/head/committee/leaves')
  }

  getCommitteeReports() {
    return this.request('/api/head/committee/reports')
  }

  approveLeaveByHead(leaveId: number) {
    return this.request(`/api/head/approve-leave/${leaveId}`, {
      method: 'PUT',
    })
  }

  rejectLeaveByHead(leaveId: number, reason: string) {
    return this.request(`/api/head/reject-leave/${leaveId}`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    })
  }

  reviewReport(reportId: number) {
    return this.request(`/api/head/review-report/${reportId}`, {
      method: 'PUT',
    })
  }

  exportCommitteePdf(chartImage?: string) {
    return this.request('/api/head/committee-export/pdf', {
      method: 'POST',
      body: JSON.stringify({ chartImage }),
    })
  }

  getHeadNotificationsCount() {
    return this.request('/api/head/notifications/count')
  }

  // GENERIC
  delete(endpoint: string) {
    return this.request(endpoint, { method: 'DELETE' })
  }

  get(endpoint: string) {
    return this.request(endpoint)
  }

  post(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  put(endpoint: string, body: any) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  }

  postRaw(endpoint: string, options: RequestInit = {}) {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${API_URL}${endpoint}`

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json'
    }

    return fetch(url, { ...options, headers })
  }
}

export const apiClient = new ApiClient()