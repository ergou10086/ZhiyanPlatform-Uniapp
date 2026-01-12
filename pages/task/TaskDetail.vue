<template>
  <view class="task-detail-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-left" @click="goBack">
          <uni-icons type="left" size="20" color="#333"></uni-icons>
        </view>
        <view class="navbar-title">任务详情</view>
        <view class="navbar-right">
          <view v-if="canEdit" class="edit-btn" @click="editTask">
            <uni-icons type="compose" size="20" color="#1677ff"></uni-icons>
          </view>
        </view>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="content" scroll-y>
      <loading-spinner v-if="loading" :overlay="true" />

      <view v-else-if="task" class="task-content">
        <!-- 任务标题和状态 -->
        <view class="task-header-card">
          <view class="task-title-row">
            <text class="task-title">{{ task.title || '未命名任务' }}</text>
            <view class="task-badges">
              <text class="priority-badge" :class="priorityClass">{{ priorityText }}</text>
              <text class="status-badge" :class="statusClass">{{ statusText }}</text>
            </view>
          </view>
          <view v-if="isOverdue" class="overdue-warning">
            <uni-icons type="info" size="16" color="#ff4d4f"></uni-icons>
            <text>已逾期</text>
          </view>
        </view>

        <!-- 任务描述 -->
        <view class="info-card">
          <view class="info-label">
            <uni-icons type="info" size="18" color="#666"></uni-icons>
            <text>任务描述</text>
          </view>
          <view class="info-value task-description">
            {{ task.description || '暂无描述' }}
          </view>
        </view>

        <!-- 任务信息 -->
        <view class="info-card">
          <view class="info-label">
            <uni-icons type="calendar" size="18" color="#666"></uni-icons>
            <text>截止日期</text>
          </view>
          <view class="info-value">
            {{ task.dueDate || task.due_date || '未设置' }}
          </view>
        </view>

        <view class="info-card">
          <view class="info-label">
            <uni-icons type="person" size="18" color="#666"></uni-icons>
            <text>创建人</text>
          </view>
          <view class="info-value">
            {{ task.creatorName || '未知' }}
          </view>
        </view>

        <view class="info-card" v-if="task.assignees && task.assignees.length > 0">
          <view class="info-label">
            <uni-icons type="person-filled" size="18" color="#666"></uni-icons>
            <text>执行者</text>
          </view>
          <view class="info-value">
            <view class="assignee-list">
              <view 
                v-for="assignee in task.assignees" 
                :key="assignee.userId || assignee.id"
                class="assignee-item"
              >
                {{ assignee.userName || assignee.name || '未知' }}
              </view>
            </view>
          </view>
        </view>

        <view class="info-card" v-if="task.requiredPeople">
          <view class="info-label">
            <uni-icons type="person-add" size="18" color="#666"></uni-icons>
            <text>需要人数</text>
          </view>
          <view class="info-value">
            {{ (task.assignees ? task.assignees.length : 0) }}/{{ task.requiredPeople }}
            <text v-if="isTaskFull" class="full-badge">已满员</text>
          </view>
        </view>

        <view class="info-card" v-if="task.worktime">
          <view class="info-label">
            <uni-icons type="clock" size="18" color="#666"></uni-icons>
            <text>预估工时</text>
          </view>
          <view class="info-value">
            {{ task.worktime }} 小时
          </view>
        </view>

        <view class="info-card">
          <view class="info-label">
            <uni-icons type="flag" size="18" color="#666"></uni-icons>
            <text>里程碑任务</text>
          </view>
          <view class="info-value">
            {{ task.isMilestone ? '是' : '否' }}
          </view>
        </view>
      </view>

      <view v-else class="error-container">
        <text class="error-text">任务不存在或加载失败</text>
      </view>
    </scroll-view>

    <!-- 底部操作栏 -->
    <view v-if="task && !isArchived" class="bottom-actions">
      <!-- 接取任务按钮 -->
      <button 
        v-if="canClaimTask" 
        class="action-btn claim-btn"
        @click="handleClaimTask"
        :disabled="claiming"
      >
        <uni-icons type="person-add-filled" size="18" color="#fff"></uni-icons>
        <text>{{ claiming ? '接取中...' : '接取任务' }}</text>
      </button>

      <!-- 已接取提示 -->
      <view v-if="isCurrentUserAssignee" class="assigned-badge">
        <uni-icons type="checkmarkempty" size="16" color="#52c41a"></uni-icons>
        <text>已接取</text>
      </view>

      <!-- 分配任务按钮（仅项目负责人可见） -->
      <button 
        v-if="canAssignMore" 
        class="action-btn assign-btn"
        @click="openAssignModal"
      >
        <uni-icons type="person-add" size="18" color="#fff"></uni-icons>
        <text>分配任务</text>
      </button>
    </view>

    <!-- 分配任务弹窗 -->
    <uni-popup ref="assignPopup" type="bottom">
      <view class="assign-modal">
        <view class="modal-header">
          <text class="modal-title">分配任务</text>
          <view class="modal-close" @click="closeAssignModal">
            <uni-icons type="close" size="20" color="#666"></uni-icons>
          </view>
        </view>
        <view class="modal-content">
          <view v-if="memberList.length === 0" class="empty-members">
            <text>暂无项目成员</text>
          </view>
          <view v-else class="member-select-list">
            <view 
              v-for="member in memberList" 
              :key="member.id || member.userId"
              class="member-select-item"
              @click="toggleMemberSelect(member)"
            >
              <view class="member-info">
                <image 
                  class="member-avatar" 
                  :src="member.avatar || defaultAvatar"
                  mode="aspectFill"
                />
                <view class="member-details">
                  <text class="member-name">{{ member.name || member.username }}</text>
                  <text class="member-role">{{ member.role || member.roleName }}</text>
                </view>
              </view>
              <view class="member-checkbox" :class="{ checked: isMemberSelected(member) }">
                <uni-icons v-if="isMemberSelected(member)" type="checkmarkempty" size="16" color="#1677ff"></uni-icons>
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @click="closeAssignModal">取消</button>
          <button class="modal-btn confirm-btn" @click="confirmAssign" :disabled="selectedMembers.length === 0 || assigning">
            {{ assigning ? '分配中...' : '确定' }}
          </button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { getTaskDetail, assignTask, claimTask } from '@/api/task.js'
import { getProjectMembers, getProjectById } from '@/api/project.js'
import config from '@/utils/config.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { sendClaimPushToCreator, sendAssignPushToMembers } from '@/utils/taskPush.js'

export default {
  components: { LoadingSpinner },
  name: 'TaskDetail',
  data() {
    return {
      taskId: '',
      projectId: '',
      task: null,
      loading: true,
      claiming: false,
      assigning: false,
      memberList: [],
      selectedMembers: [],
      currentUserId: null,
      isProjectManager: false,
      isArchived: false
    }
  },
  computed: {
    canEdit() {
      // 只有项目负责人可以编辑
      return this.isProjectManager && !this.isArchived
    },
    canManageProject() {
      // 项目负责人可以分配任务
      return this.isProjectManager && !this.isArchived
    },
    canAssignMore() {
      if (!this.task || this.isArchived) return false
      if (!this.canManageProject) return false
      const requiredPeople = Number(this.task.requiredPeople || 0)
      if (!requiredPeople) return false
      const currentCount = this.task.assignees ? this.task.assignees.length : 0
      return currentCount < requiredPeople
    },
    canClaimTask() {
      if (!this.task || this.isArchived) return false
      if (this.task.status === 'DONE' || this.task.status === '完成') return false
      if (this.isCurrentUserAssignee) return false
      if (this.isTaskFull) return false
      return true
    },
    isCurrentUserAssignee() {
      if (!this.task || !this.currentUserId) return false
      if (!this.task.assignees || !Array.isArray(this.task.assignees)) return false
      const currentUserIdStr = String(this.currentUserId)
      return this.task.assignees.some(assignee => {
        const assigneeId = String(assignee.userId || assignee.id || '')
        return assigneeId === currentUserIdStr
      })
    },
    isTaskFull() {
      if (!this.task || !this.task.requiredPeople) return false
      const currentCount = this.task.assignees ? this.task.assignees.length : 0
      return currentCount >= this.task.requiredPeople
    },
    isOverdue() {
      if (!this.task || !this.task.dueDate) return false
      const dueDate = new Date(this.task.dueDate)
      const now = new Date()
      return dueDate < now && this.task.status !== 'DONE' && this.task.status !== '完成'
    },
    statusText() {
      if (!this.task) return ''
      const status = (this.task.status || '').toString().toUpperCase()
      const statusMap = {
        'TODO': '待接取',
        'IN_PROGRESS': '进行中',
        'BLOCKED': '阻塞',
        'PENDING_REVIEW': '待审核',
        'DONE': '完成'
      }
      return statusMap[status] || status
    },
    statusClass() {
      if (!this.task) return ''
      const status = (this.task.status || '').toString().toUpperCase()
      if (status === 'DONE') return 'status-done'
      if (status === 'IN_PROGRESS') return 'status-running'
      if (status === 'BLOCKED') return 'status-blocked'
      if (status === 'PENDING_REVIEW') return 'status-pending'
      return 'status-todo'
    },
    priorityText() {
      if (!this.task) return ''
      const priority = (this.task.priority || '').toString().toUpperCase()
      const priorityMap = {
        'HIGH': '高',
        'MEDIUM': '中',
        'LOW': '低'
      }
      return priorityMap[priority] || '中'
    },
    priorityClass() {
      if (!this.task) return ''
      const priority = (this.task.priority || '').toString().toUpperCase()
      if (priority === 'HIGH') return 'priority-high'
      if (priority === 'LOW') return 'priority-low'
      return 'priority-medium'
    },
    defaultAvatar() {
      return 'https://dummyimage.com/100x100/f2f2f2/999&text=U'
    }
  },
  onLoad(options) {
    if (options && options.id) {
      this.taskId = options.id
    }
    if (options && options.projectId) {
      this.projectId = options.projectId
    }
    this.getCurrentUserInfo()
    if (this.taskId) {
      this.fetchTaskDetail()
    }
  },
  methods: {
    getCurrentUserInfo() {
      try {
        const userInfo = uni.getStorageSync(config.userInfoKey)
        if (userInfo) {
          const user = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo
          this.currentUserId = user.id || user.userId
        }
      } catch (e) {
        console.error('获取用户信息失败:', e)
      }
    },
    async fetchTaskDetail() {
      try {
        this.loading = true
        
        // 确保有projectId
        if (!this.projectId) {
          uni.showToast({
            title: '缺少项目ID',
            icon: 'none'
          })
          this.loading = false
          return
        }
        
        const res = await getTaskDetail(this.taskId, this.projectId)
        
        console.log('[fetchTaskDetail] 获取任务详情结果:', res)
        
        if (res && (res.code === 200 || res.code === 0)) {
          // 将返回的任务数据赋值给task
          // 注意：res已经包含了任务的所有字段（因为使用了...task展开）
          this.task = res
          this.projectId = this.projectId || res.projectId
          
          // 获取项目成员信息以判断权限
          if (this.projectId) {
            await Promise.all([
              this.fetchProjectMembers(),
              this.fetchProjectDetail()
            ])
            this.checkProjectManager()
          }
        } else if (res && res.code === 404) {
          uni.showToast({
            title: res.msg || '任务不存在',
            icon: 'none'
          })
        } else {
          uni.showToast({
            title: (res && (res.msg || res.message)) || '获取任务详情失败',
            icon: 'none'
          })
        }
      } catch (e) {
        console.error('获取任务详情失败:', e)
        uni.showToast({
          title: e.message || '获取任务详情失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    async fetchProjectMembers() {
      try {
        const res = await getProjectMembers(this.projectId, 0, 100)
        
        if (res && (res.code === 200 || res.code === 0)) {
          let list = []
          
          if (res.content && Array.isArray(res.content)) {
            list = res.content
          } else if (res.data && res.data.content && Array.isArray(res.data.content)) {
            list = res.data.content
          } else if (Array.isArray(res.data)) {
            list = res.data
          } else if (Array.isArray(res)) {
            list = res
          }
          
          this.memberList = list.map(member => {
            const id = String(member.userId || member.id || '')
            const name = member.username || member.name || '未知用户'
            const role = member.roleName || member.role || '成员'
            const avatar = member.avatar || this.defaultAvatar
            
            return {
              id,
              userId: member.userId || member.id,
              name,
              username: member.username,
              role,
              roleName: member.roleName,
              roleCode: member.roleCode || member.role,
              avatar
            }
          })
        }
      } catch (e) {
        console.error('获取项目成员失败:', e)
      }
    },
    async fetchProjectDetail() {
      try {
        const res = await getProjectById(this.projectId)
        
        if (res && (res.code === 200 || res.code === 0)) {
          const project = res
          const status = String(project.status || '').toUpperCase()
          this.isArchived = status === 'ARCHIVED'
        }
      } catch (e) {
        console.error('获取项目详情失败:', e)
      }
    },
    checkProjectManager() {
      if (!this.currentUserId || !this.memberList.length) {
        this.isProjectManager = false
        return
      }
      
      const currentUserIdStr = String(this.currentUserId)
      const currentMember = this.memberList.find(m => {
        const memberId = String(m.userId || m.id || '')
        return memberId === currentUserIdStr
      })
      
      if (currentMember) {
        const roleCode = String(currentMember.roleCode || '').toUpperCase()
        this.isProjectManager = roleCode === 'OWNER' || roleCode === 'ADMIN'
      }
    },
    async handleClaimTask() {
      if (!this.canClaimTask || this.claiming) return
      
      try {
        this.claiming = true
        const res = await claimTask(this.taskId)
        
        if (res && (res.code === 200 || res.code === 0)) {
          uni.showToast({
            title: '接取任务成功',
            icon: 'success'
          })
          try {
            await sendClaimPushToCreator(this.task, this.projectId)
          } catch (e) {
            console.error('[handleClaimTask] push failed:', e)
          }
          // 重新获取任务详情
          await this.fetchTaskDetail()
        } else {
          uni.showToast({
            title: (res && (res.msg || res.message)) || '接取任务失败',
            icon: 'none'
          })
        }
      } catch (e) {
        console.error('接取任务失败:', e)
        uni.showToast({
          title: e.message || '接取任务失败',
          icon: 'none'
        })
      } finally {
        this.claiming = false
      }
    },
    openAssignModal() {
      if (!this.canManageProject) return
      // 初始化选中成员为当前任务的执行者
      this.selectedMembers = []
      if (this.task && this.task.assignees && Array.isArray(this.task.assignees)) {
        this.selectedMembers = this.task.assignees.map(a => a.userId || a.id)
      }
      this.$refs.assignPopup.open()
    },
    closeAssignModal() {
      this.$refs.assignPopup.close()
      this.selectedMembers = []
    },
    toggleMemberSelect(member) {
      const memberId = member.userId || member.id
      const index = this.selectedMembers.indexOf(memberId)
      if (index > -1) {
        this.selectedMembers.splice(index, 1)
      } else {
        // 检查是否超过任务需要人数
        if (this.task && this.task.requiredPeople && this.selectedMembers.length >= this.task.requiredPeople) {
          uni.showToast({
            title: `任务最多需要${this.task.requiredPeople}人`,
            icon: 'none'
          })
          return
        }
        this.selectedMembers.push(memberId)
      }
    },
    isMemberSelected(member) {
      const memberId = member.userId || member.id
      return this.selectedMembers.indexOf(memberId) > -1
    },
    async confirmAssign() {
      if (this.selectedMembers.length === 0 || this.assigning) return
      
      try {
        this.assigning = true
        const res = await assignTask(this.taskId, this.selectedMembers)
        
        if (res && (res.code === 200 || res.code === 0)) {
          uni.showToast({
            title: '分配任务成功',
            icon: 'success'
          })
          try {
            await sendAssignPushToMembers(this.task, this.selectedMembers, this.projectId)
          } catch (e) {
            console.error('[confirmAssign] push failed:', e)
          }
          this.closeAssignModal()
          // 重新获取任务详情
          await this.fetchTaskDetail()
        } else {
          uni.showToast({
            title: (res && (res.msg || res.message)) || '分配任务失败',
            icon: 'none'
          })
        }
      } catch (e) {
        console.error('分配任务失败:', e)
        uni.showToast({
          title: e.message || '分配任务失败',
          icon: 'none'
        })
      } finally {
        this.assigning = false
      }
    },
    editTask() {
      // 跳转到任务编辑页面（如果存在）
      uni.showToast({
        title: '编辑功能开发中',
        icon: 'none'
      })
    },
    goBack() {
      uni.navigateBack()
    },

    
  }
}
</script>

<style lang="scss" scoped>
@import '@/static/styles/TaskDetail.scss';
</style>

