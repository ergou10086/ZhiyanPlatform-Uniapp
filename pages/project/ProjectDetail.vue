
<template>
  <view class="page">
    <!-- 顶部项目封面与简介 -->
    <view class="header-card">
      <view class="back-btn" :style="{ top: (statusBarHeight + 16) + 'px' }" @click.stop="goBack">
        <uni-icons type="left" size="20" color="#ffffff"></uni-icons>
      </view>
      <image
        class="header-image"
        :src="projectCover"
        mode="aspectFill"
      />
      <view class="header-body">
        <view class="project-title">
          {{ projectTitle }}
        </view>
        <view class="project-desc">
          {{ projectDesc }}
        </view>

        <view class="project-meta">
          <view class="meta-row">
            <text class="meta-label">起止时间：</text>
            <text class="meta-value">{{ projectStartDate }} 至 {{ projectEndDate }}</text>
          </view>
          <view class="meta-row">
            <text class="meta-label">当前状态：</text>
            <text class="meta-value status-running">{{ projectStatusText }}</text>
          </view>
          <view class="meta-row">
            <text class="meta-label">项目负责人：</text>
            <text class="meta-value">{{ projectLeader }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 页面主体内容 -->
    <scroll-view class="content" scroll-y>
      <view class="section">
        <view class="section-header">
          <view class="section-title">任务列表</view>
          <view v-if="canPublishTask && !isArchived" class="create-task-btn-small" @click.stop="createTask">
            <text class="create-task-icon-small">+</text>
            <text class="create-task-text-small">发布任务</text>
          </view>
          <!-- 临时调试：显示权限状态 -->
          <!-- <view style="font-size: 20rpx; color: red;">
            canManage: {{ canManageProject }}, archived: {{ isArchived }}, members: {{ memberList.length }}
          </view> -->
        </view>

        <view class="task-status-filter">
          <view
            v-for="opt in taskStatusFilterOptions"
            :key="opt.value"
            class="task-status-filter-item"
            :class="{ active: selectedTaskStatusFilter === opt.value }"
            @click="setTaskStatusFilter(opt.value)"
          >
            {{ opt.label }}
          </view>
        </view>

        <scroll-view class="task-list" scroll-x show-scrollbar="false">
          <view class="task-list-inner">
            <view
              v-for="task in displayTaskList"
              :key="task.id"
              class="task-card"
              @click="ignoreClickTaskId !== task.id && viewTaskDetail(task)"
              @longpress.stop="handleTaskLongPress(task)"
              @touchstart="handleTaskTouchStart(task, $event)"
              @touchmove="handleTaskTouchMove(task, $event)"
              @touchend="handleTaskTouchEnd(task, $event)"
            >
              <!-- 编辑按钮（右上角圆形按钮） -->
              <view
                v-if="canEditTask(task)"
                class="task-edit-btn"
                @click.stop="editTask(task)"
              >
                <uni-icons type="compose" size="18" color="#1677ff"></uni-icons>
              </view>
              
              <view class="task-status-row">
                <text
                  class="task-status-dot"
                  :class="taskStatusDotClass(task)"
                ></text>
                <text
                  class="task-status-text"
                  :class="taskStatusTextClass(task)"
                >
                  {{ task.statusText }}
                </text>
              </view>

              <view class="task-title">
                {{ truncateTaskTitle(task.title) }}
              </view>

              <view class="task-meta">
                <view class="task-meta-row">
                  <text class="task-meta-label">截止：</text>
                  <text class="task-meta-value">{{ task.deadline }}</text>
                </view>
                <view class="task-meta-row">
                  <text class="task-meta-label">创建人：</text>
                  <text class="task-meta-value">{{ task.creator }}</text>
                </view>
                <view class="task-meta-row">
                  <text class="task-meta-label">负责人：</text>
                  <text class="task-meta-value">{{ task.owner }}</text>
                </view>
              </view>

              <view class="task-actions">
                <!-- 项目负责人：分配任务按钮 -->
                <view
                  v-if="canAssignTask(task)"
                  class="task-action-btn task-action-btn--assign"
                  @click.stop="openAssignTaskModal(task)"
                >
                  分配
                </view>
                <!-- 未接取任务：接取按钮（所有项目成员可见） -->
                <view
                  v-if="canClaimTask(task)"
                  class="task-action-btn task-action-btn--claim"
                  @click.stop="handleClaimTask(task)"
                >
                  接取
                </view>
                <!-- 已接取任务：提交/更改提交按钮（执行者可见） -->
                <view
                  v-if="canSubmitTask(task)"
                  class="task-action-btn task-action-btn--submit"
                  @click.stop="openTaskSubmission(task)"
                >
                  {{ hasSubmission(task) ? '更改提交' : '提交' }}
                </view>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>

      <view class="section">
        <view class="section-title">团队成员</view>

        <view class="member-list">
          <view
            v-for="member in memberList"
            :key="member.id"
            class="member-item"
          >
            <image
              class="member-avatar"
              :src="member.avatar"
              mode="aspectFill"
            />
            <view class="member-info-row">
              <view class="member-name">{{ member.name }}</view>
              <view class="member-role-tag">{{ roleLabel(member.role) }}</view>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 分配任务弹窗 -->
    <uni-popup ref="assignPopup" type="bottom">
      <view class="assign-modal">
        <view class="modal-header">
          <text class="modal-title">分配任务</text>
          <view class="modal-close" @click="closeAssignTaskModal">
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
              :key="member.id"
              class="member-select-item"
              @click="toggleMemberSelect(member)"
            >
              <view class="member-info">
                <image
                  class="member-avatar"
                  :src="member.avatar"
                  mode="aspectFill"
                />
                <view class="member-details">
                  <text class="member-name">{{ member.name }}</text>
                  <text class="member-role">{{ member.role }}</text>
                </view>
              </view>
              <view class="member-checkbox" :class="{ checked: isMemberSelected(member) }">
                <uni-icons v-if="isMemberSelected(member)" type="checkmarkempty" size="16" color="#1677ff"></uni-icons>
              </view>
            </view>
          </view>
        </view>
        <view class="modal-footer">
          <button class="modal-btn cancel-btn" @click="closeAssignTaskModal">取消</button>
          <button class="modal-btn confirm-btn" @click="confirmAssign" :disabled="selectedMembers.length === 0 || assigning">
            {{ assigning ? '分配中...' : '确定' }}
          </button>
        </view>
      </view>
    </uni-popup>
  </view>
</template>

<script>
import { getProjectById, getProjectMembers } from '@/api/project.js'
import { getProjectTasks, deleteTask } from '@/api/task.js'
import { sendClaimPushToCreator, sendAssignPushToMembers } from '@/utils/taskPush.js'
import config from '@/utils/config.js'

export default {
  name: 'ProjectDetail',
  data() {
    return {
      statusBarHeight: 0,
      projectId: '',
      project: null,
      loading: false,
      taskList: [],
      memberList: [],
      currentUserId: null,
      rawTaskList: [], // 保存原始任务数据
      isArchived: false, // 项目是否已归档
      taskToAssign: null, // 待分配的任务
      assignModalVisible: false, // 分配任务弹窗显示状态
      selectedMembers: [], // 选中的成员ID列表
      assigning: false, // 是否正在分配
      deletingTaskId: null,
      ignoreClickTaskId: null,
      taskTouchStartX: 0,
      taskTouchStartY: 0,
      taskTouchMoved: false,
      taskTouchMovedTaskId: null,
      selectedTaskStatusFilter: '',
      taskStatusFilterOptions: [
        { label: '全部', value: '' },
        { label: '待接取', value: '待接取' },
        { label: '进行中', value: '进行中' },
        { label: '阻塞', value: '阻塞' },
        { label: '待审核', value: '待审核' },
        { label: '完成', value: '完成' }
      ]
    };
  },
  onLoad(options) {
    try {
      const systemInfo = uni.getSystemInfoSync();
      this.statusBarHeight = systemInfo.statusBarHeight || 0;
    } catch (e) {
      this.statusBarHeight = 0;
    }
    const pid = options?.projectId || options?.id || ''
    this.projectId = String(pid || '')
    this.getCurrentUserInfo()
    if (!this.projectId) {
      uni.showToast({
        title: '缺少项目ID',
        icon: 'none'
      })
      return
    }
    this.fetchProjectDetail()
    this.fetchProjectMembers()
    this.fetchProjectTasks()
  },
  onShow() {
    if (!this.projectId) return
    this.fetchProjectDetail()
    this.fetchProjectMembers()
    this.fetchProjectTasks()
  },
  computed: {
    projectTitle() {
      return this.project?.name || this.project?.title || '未命名项目';
    },
    projectDesc() {
      return this.project?.description || '暂无项目描述';
    },
    projectStartDate() {
      return this.project?.startDate || '';
    },
    projectEndDate() {
      return this.project?.endDate || '';
    },
    projectStatusText() {
      const raw = (this.project?.status || 'ONGOING').toString().toUpperCase();
      switch (raw) {
        case 'PLANNING':
          return '规划中';
        case 'ONGOING':
        case 'IN_PROGRESS':
          return '进行中';
        case 'COMPLETED':
        case 'DONE':
          return '已完成';
        case 'ARCHIVED':
          return '已归档';
        default:
          return '进行中';
      }
    },
    projectCover() {
      if (!this.project) {
        return 'https://dummyimage.com/750x350/edf3ff/3b6ff5&text=Project+Cover';
      }
      const raw = this.project.imageUrl || this.project.image;
      if (!raw) {
        return 'https://dummyimage.com/750x350/edf3ff/3b6ff5&text=Project+Cover';
      }
      // 如果是完整的HTTP/HTTPS URL（COS URL），直接使用
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        return raw;
      }
      // 如果是后端接口路径（如 /zhiyan/projects/{id}/image），在手机端无法正确处理302重定向
      // 这种情况应该使用占位图，因为拼接baseURL后仍然会返回302重定向，手机端无法处理
      if (raw.startsWith('/zhiyan/projects/') && (raw.endsWith('/image') || raw.includes('/image'))) {
        // 这是后端接口路径，在手机端无法正确处理302重定向，使用占位图
        console.warn('[ProjectDetail] 项目图片URL是后端接口路径，手机端无法正确处理，使用占位图:', raw);
        return 'https://dummyimage.com/750x350/edf3ff/3b6ff5&text=Project+Cover';
      }
      // 其他相对路径，拼接baseURL
      if (raw.startsWith('/')) {
        return config.baseURL + raw;
      }
      // 其他情况，拼接baseURL
      return config.baseURL + raw;
    },
    projectLeader() {
      return this.project?.creatorName || '未设置';
    },
    canManageProject() {
      // 判断当前用户是否是项目负责人（OWNER或ADMIN）
      if (!this.currentUserId) {
        return false;
      }

      // 如果成员列表还没加载，返回false
      if (!this.memberList || this.memberList.length === 0) {
        return false;
      }

      const currentUserIdStr = String(this.currentUserId);
      const currentMember = this.memberList.find(m => {
        const memberId = String(m.id || m.userId || '');
        const memberUserId = String(m.userId || '');
        return memberId === currentUserIdStr || memberUserId === currentUserIdStr;
      });

      if (currentMember) {
        const roleCode = String(currentMember.roleCode || '').toUpperCase();
        const roleName = String(currentMember.role || '').toUpperCase();

        // 检查是否为OWNER
        const isOwnerRole = roleCode === 'OWNER' ||
                           roleName.includes('OWNER') ||
                           roleName.includes('拥有者') ||
                           roleName.includes('负责人') ||
                           currentMember.role === '项目拥有者' ||
                           currentMember.role === '项目负责人';

        // 检查是否为ADMIN
        const isAdminRole = roleCode === 'ADMIN' ||
                           roleName.includes('ADMIN') ||
                           roleName.includes('管理员') ||
                           currentMember.role === '项目管理员';

        return isOwnerRole || isAdminRole;
      }

      return false;
    },
    canPublishTask() {
      // 仅项目负责人和项目管理员可以发布任务
      return this.canManageProject;
    },
    isProjectMember() {
      if (!this.currentUserId) return false;
      if (!this.memberList || this.memberList.length === 0) return false;
      const currentUserIdStr = String(this.currentUserId);
      return this.memberList.some(m => {
        const memberId = String(m.id || m.userId || '');
        const memberUserId = String(m.userId || '');
        return memberId === currentUserIdStr || memberUserId === currentUserIdStr;
      });
    },
    displayTaskList() {
      const selected = this.selectedTaskStatusFilter;
      if (!selected) return this.taskList;
      return this.taskList.filter(t => String(t.status || '') === selected);
    }
  },
  methods: {
    setTaskStatusFilter(value) {
      this.selectedTaskStatusFilter = value || '';
    },
    mapTaskStatusText(raw) {
      const s = String(raw || '').toUpperCase();
      if (s === 'DONE') return '完成';
      if (s === 'TODO') return '待接取';
      if (s === 'BLOCKED') return '阻塞';
      if (s === 'PENDING_REVIEW') return '待审核';
      if (s === 'IN_PROGRESS' || s === 'ONGOING' || s === 'RUNNING') return '进行中';
      return '进行中';
    },
    taskStatusDotClass(task) {
      const text = String(task?.statusText || task?.status || '');
      return {
        'task-status-dot--todo': text === '待接取',
        'task-status-dot--running': text === '进行中',
        'task-status-dot--blocked': text === '阻塞',
        'task-status-dot--review': text === '待审核',
        'task-status-dot--done': text === '完成'
      };
    },
    taskStatusTextClass(task) {
      const text = String(task?.statusText || task?.status || '');
      return {
        'task-status-text--todo': text === '待接取',
        'task-status-text--running': text === '进行中',
        'task-status-text--blocked': text === '阻塞',
        'task-status-text--review': text === '待审核',
        'task-status-text--done': text === '完成'
      };
    },
    fetchProjectTasksSilent() {
      const projectId = String(this.projectId || '')
      if (!projectId) return Promise.resolve(false)
      const token = uni.getStorageSync(config.tokenKey)
      const url = config.baseURL + `/zhiyan/projects/tasks/projects/${projectId}`
      return new Promise((resolve) => {
        uni.request({
          url,
          method: 'GET',
          data: { page: 0, size: 50 },
          header: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          timeout: config.timeout,
          success: (res) => {
            try {
              if (res.statusCode === 200 && res.data && (res.data.code === 200 || res.data.code === 0)) {
                const body = res.data
                const data = body.data
                const list = (data && data.content && Array.isArray(data.content)) ? data.content : []
                this.rawTaskList = list
                this.taskList = list.map(task => {
                  const taskId = String(task.id || task.idStr || '')
                  const rawStatus = (task.status || 'TODO').toString().toUpperCase()
                  const statusText = this.mapTaskStatusText(rawStatus)
                  let ownerName = ''
                  if (task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0) {
                    ownerName = task.assignees.map(a => a.userName).join('，')
                  }
                  const owner = ownerName || (statusText === '待接取' ? '无' : (task.creatorName || '未设置'))
                  return {
                    id: taskId,
                    status: statusText,
                    statusText,
                    title: task.title || '未命名任务',
                    deadline: task.dueDate || '',
                    creator: task.creatorName || '未知',
                    owner,
                    rawTask: task
                  }
                })
                resolve(true)
                return
              }
            } catch (e) {
              console.error('[fetchProjectTasksSilent] parse failed:', e)
            }
            console.error('[fetchProjectTasksSilent] refresh failed:', {
              statusCode: res.statusCode,
              data: res.data
            })
            resolve(false)
          },
          fail: (err) => {
            console.error('[fetchProjectTasksSilent] request failed:', err)
            resolve(false)
          }
        })
      })
    },
    goBack() {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      if (pages && pages.length > 1) {
        uni.navigateBack()
        return
      }
      uni.reLaunch({
        url: '/pages/project/projectsquare'
      })
    },
    // 截取任务标题，最多显示9个字
    truncateTaskTitle(title) {
      if (!title) return '';
      const titleStr = String(title);
      if (titleStr.length <= 9) {
        return titleStr;
      }
      return titleStr.substring(0, 9) + '...';
    },
    roleLabel(role) {
      const text = String(role || '').trim();
      if (!text) return '';
      return text.split(/[，,]/)[0].trim();
    },
    // 批量检查任务的提交状态
    async checkTasksSubmissionStatus(tasks) {
      // 只检查当前用户是执行者的任务
      if (!this.currentUserId) return;

      try {
        const { getTaskSubmissions } = await import('@/api/taskSubmission.js');
        const currentUserIdStr = String(this.currentUserId);

        // 并发检查所有任务（限制并发数为5）
        const batchSize = 5;
        for (let i = 0; i < tasks.length; i += batchSize) {
          const batch = tasks.slice(i, i + batchSize);
          await Promise.all(batch.map(async (task) => {
            // 只检查当前用户是执行者的任务
            const isAssignee = task.assignees && Array.isArray(task.assignees) &&
              task.assignees.some(a => String(a.userId || a.id || '') === currentUserIdStr);

            if (isAssignee) {
              try {
                // 使用字符串格式的任务ID，避免长整型精度丢失
                const taskId = String(task.id || '');
                if (taskId && taskId !== 'undefined' && taskId !== 'null') {
                  const response = await getTaskSubmissions(taskId);
                  if (response && response.code === 200 && response.data) {
                    const submissions = Array.isArray(response.data) ? response.data : [];
                    task.hasSubmission = submissions.length > 0;
                  }
                }
              } catch (error) {
                console.error(`检查任务 ${String(task.id || '')} 提交状态失败:`, error);
                task.hasSubmission = false;
              }
            }
          }));
        }
      } catch (error) {
        console.error('批量检查任务提交状态失败:', error);
      }
    },
    // 检查任务是否已完成
    isTaskCompleted(task) {
      const rawTask = task.rawTask || task;
      const status = String(rawTask.status || '').toUpperCase();
      return status === 'DONE' || status === '完成';
    },
    // 检查任务是否已结束（完成/审核完成/归档等结束态）
    isTaskEnded(task) {
      if (this.isArchived) return true;
      const rawTask = task.rawTask || task;
      const status = String(rawTask.status || '').toUpperCase();
      const statusText = String(rawTask.statusText || task.statusText || '').toUpperCase();
      return (
        status === 'DONE' ||
        status === 'COMPLETED' ||
        status === 'ARCHIVED' ||
        status === 'APPROVED' ||
        status === 'REJECTED' ||
        statusText.includes('已完成') ||
        statusText.includes('完成') ||
        statusText.includes('审核完成') ||
        statusText.includes('已归档')
      );
    },
    // 任务是否已被分配/接取（已有执行者）
    isTaskAssigned(task) {
      const rawTask = task.rawTask || task;
      return !!(rawTask.assignees && Array.isArray(rawTask.assignees) && rawTask.assignees.length > 0);
    },

    isTaskFull(task) {
      const rawTask = task.rawTask || task;
      const requiredPeople = Number(rawTask.requiredPeople || 0);
      if (!requiredPeople) return false;
      const currentCount = rawTask.assignees && Array.isArray(rawTask.assignees) ? rawTask.assignees.length : 0;
      return currentCount >= requiredPeople;
    },
    // 当前用户是否为任务创建人
    isTaskCreator(task) {
      if (!this.currentUserId) return false;
      const rawTask = task.rawTask || task;
      const currentUserIdStr = String(this.currentUserId);
      const creatorId = String(
        rawTask.creatorId ||
          rawTask.createdBy ||
          rawTask.taskCreatorId ||
          rawTask.createdById ||
          rawTask.creator?.id ||
          ''
      );
      return creatorId && creatorId === currentUserIdStr;
    },
    canAssignTask(task) {
      if (this.isTaskEnded(task)) return false;
      if (!this.isProjectMember) return false;
      if (!this.canManageProject) return false;
      if (this.isTaskFull(task)) return false;
      return true;
    },
    canEditTask(task) {
      // 任务创建人可以编辑任务；任务结束后不可操作
      if (this.isTaskEnded(task)) return false;
      if (!this.isProjectMember) return false;
      return this.canManageProject || this.isTaskCreator(task);
    },
    // 检查当前用户是否是任务执行者
    isCurrentUserAssignee(task) {
      if (!this.currentUserId) return false;
      const rawTask = task.rawTask || task;
      if (!rawTask.assignees || !Array.isArray(rawTask.assignees)) return false;
      const currentUserIdStr = String(this.currentUserId);
      return rawTask.assignees.some(assignee => {
        const assigneeId = String(assignee.userId || assignee.id || '');
        return assigneeId === currentUserIdStr;
      });
    },
    // 检查是否可以接取任务
    canClaimTask(task) {
      // 所有项目成员都可以接取未被接取的任务（任务结束后不可操作）
      if (this.isTaskEnded(task)) return false;
      if (!this.isProjectMember) return false;
      if (this.isCurrentUserAssignee(task)) return false;
      const rawTask = task.rawTask || task;
      // 检查任务是否已满员
      if (rawTask.requiredPeople) {
        const currentCount = rawTask.assignees ? rawTask.assignees.length : 0;
        if (currentCount >= rawTask.requiredPeople) return false;
      }
      return true;
    },
    canSubmitTask(task) {
      // 任务负责人可以提交和更改提交任务；任务结束后不可操作
      if (this.isTaskEnded(task)) return false;
      return this.isCurrentUserAssignee(task);
    },
    // 检查任务是否有提交
    hasSubmission(task) {
      const rawTask = task.rawTask || task;
      // 检查是否有提交记录（通过检查任务状态或提交标志）
      if (rawTask.hasSubmission !== undefined) {
        return rawTask.hasSubmission;
      }
      // 如果状态是待审核，说明有提交
      const status = String(rawTask.status || '').toUpperCase();
      return status === 'PENDING_REVIEW' || status === '待审核';
    },
    // 检查项目是否已归档
    checkProjectArchived() {
      if (this.project) {
        const status = String(this.project.status || '').toUpperCase();
        this.isArchived = status === 'ARCHIVED';
      }
    },
    async fetchProjectDetail() {
      try {
        this.loading = true;
        const res = await getProjectById(this.projectId);

        if (res && (res.code === 200 || res.code === 0)) {
          // request.js 已经把 R<Project>.data 展开到顶层
          this.project = res;
          this.checkProjectArchived();
        } else {
          uni.showToast({
            title: (res && (res.msg || res.message)) || '获取项目详情失败',
            icon: 'none'
          });
        }
      } catch (e) {
        console.error('获取项目详情失败:', e);
        uni.showToast({
          title: e.message || '获取项目详情失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },

    // 加载当前项目的任务列表
    async fetchProjectTasks(silent = false) {
      try {
        const res = await getProjectTasks(this.projectId, 0, 50);

        if (res && (res.code === 200 || res.code === 0)) {
          let list = [];

          if (res.content && Array.isArray(res.content)) {
            list = res.content;
          } else if (res.data && res.data.content && Array.isArray(res.data.content)) {
            list = res.data.content;
          } else if (Array.isArray(res.data)) {
            list = res.data;
          } else if (Array.isArray(res)) {
            list = res;
          }

          // 保存原始任务数据
          this.rawTaskList = list;

          // 暂时不批量检查提交状态，改为在需要时按需检查
          // 这样可以避免性能问题和可能的异步问题

          const toSortTime = (task) => {
            const raw = task?.created_at || task?.createdAt || task?.createTime || task?.createdTime || task?.createdAtStr || task?.created_at_str;
            const dt = raw ? new Date(raw) : null;
            const t = dt ? dt.getTime() : NaN;
            if (!Number.isNaN(t)) return t;
            const idLike = task?.id || task?.idStr;
            const num = typeof idLike === 'number' ? idLike : Number(idLike);
            return Number.isNaN(num) ? 0 : num;
          };

          const sortedList = [...list].sort((a, b) => toSortTime(b) - toSortTime(a));

          this.taskList = sortedList.map(task => {
            // 处理 ID 精度问题：确保使用 String 类型
            const taskId = String(task.id || task.idStr || '');

            // 状态与文字映射（根据后端 TaskStatus 枚举）
            const rawStatus = (task.status || 'TODO').toString().toUpperCase();
            const statusText = this.mapTaskStatusText(rawStatus);

            // 执行人名称
            let ownerName = '';
            if (task.assignees && Array.isArray(task.assignees) && task.assignees.length > 0) {
              ownerName = task.assignees.map(a => a.userName).join('，');
            }

            const owner = ownerName || (statusText === '待接取' ? '无' : (task.creatorName || '未设置'));

            return {
              id: taskId,
              status: statusText,
              statusText,
              title: task.title || '未命名任务',
              deadline: task.dueDate || '',
              creator: task.creatorName || '未知',
              owner,
              // 保存原始任务数据用于权限判断（保留原始ID格式）
              rawTask: task
            };
          });
        } else {
          if (!silent) {
            uni.showToast({
              title: (res && (res.msg || res.message)) || '获取任务列表失败',
              icon: 'none'
            });
          }
        }
      } catch (e) {
        console.error('获取任务列表失败:', e);
        if (!silent) {
          uni.showToast({
            title: e.message || '获取任务列表失败',
            icon: 'none'
          });
        }
      }
    },

    // 加载项目团队成员列表
    async fetchProjectMembers() {
      try {
        const res = await getProjectMembers(this.projectId, 0, 50);

        if (res && (res.code === 200 || res.code === 0)) {
          let list = [];

          if (res.content && Array.isArray(res.content)) {
            list = res.content;
          } else if (res.data && res.data.content && Array.isArray(res.data.content)) {
            list = res.data.content;
          } else if (Array.isArray(res.data)) {
            list = res.data;
          } else if (Array.isArray(res)) {
            list = res;
          }

          this.memberList = list.map(member => {
            // 处理 ID 精度问题：确保使用 String 类型
            // 后端已经通过 @LongToString 将 Long 转为 String，但需要确保前端也使用 String
            const id = String(member.userId || member.id || member.userIdStr || member.idStr || '');
            const name = member.username || member.name || '未知用户';
            const role = member.roleName || member.role || '成员';

            // 处理头像：优先使用后端返回的 avatar（可能是 data URL 或 URL）
            // 如果没有，则使用占位图
            let avatar = null;
            if (member.avatar) {
              // 如果已经是完整的 URL（http/https）或者是 data URL，直接使用
              if (member.avatar.startsWith('http') || member.avatar.startsWith('data:')) {
                avatar = member.avatar;
              } else {
                // 如果是相对路径，需要拼接 baseURL
                avatar = config.baseURL + member.avatar;
              }
            }

            // 如果没有头像，使用占位图
            if (!avatar) {
              avatar = 'https://dummyimage.com/100x100/f2f2f2/999&text=' +
                encodeURIComponent(name.substring(0, 1).toUpperCase());
            }

            return {
              id,
              name,
              role,
              avatar
            };
          });
        } else {
          uni.showToast({
            title: (res && (res.msg || res.message)) || '获取成员列表失败',
            icon: 'none'
          });
        }
      } catch (e) {
        console.error('获取成员列表失败:', e);
        uni.showToast({
          title: e.message || '获取成员列表失败',
          icon: 'none'
        });
      }
    },
    getCurrentUserInfo() {
      try {
        const userInfo = uni.getStorageSync(config.userInfoKey);
        if (userInfo) {
          const user = typeof userInfo === 'string' ? JSON.parse(userInfo) : userInfo;
          this.currentUserId = user.id || user.userId;
        }
      } catch (e) {
        console.error('获取用户信息失败:', e);
      }
    },
    viewTaskDetail(task) {
      if (this.ignoreClickTaskId && String(this.ignoreClickTaskId) === String(task.id || '')) {
        return
      }
      // 跳转到任务详情页面
      const taskId = task.id;
      if (!taskId) {
        uni.showToast({
          title: '任务ID不存在',
          icon: 'none'
        });
        return;
      }
      uni.navigateTo({
        url: `/pages/task/TaskDetail?id=${taskId}&projectId=${this.projectId}`
      });
    },

    canDeleteTask(task) {
      if (this.isTaskEnded(task)) return false;
      if (!this.isProjectMember) return false;
      return this.canManageProject;
    },

    async handleTaskLongPress(task) {
      if (this.taskTouchMoved && String(this.taskTouchMovedTaskId || '') === String(task.id || '')) {
        return
      }

      this.ignoreClickTaskId = String(task.id || '')
      setTimeout(() => {
        if (this.ignoreClickTaskId && String(this.ignoreClickTaskId) === String(task.id || '')) {
          this.ignoreClickTaskId = null
        }
      }, 400)

      if (!this.canDeleteTask(task)) {
        uni.showToast({
          title: '无权限删除该任务',
          icon: 'none'
        })
        return
      }

      if (this.deletingTaskId) {
        return
      }

      uni.showModal({
        title: '删除任务',
        content: '确定要删除该任务吗？',
        confirmText: '删除',
        confirmColor: '#e43d33',
        success: async (res) => {
          if (!res.confirm) return

          const rawTask = task.rawTask || task
          const taskId = String(rawTask.id || task.id || '')
          if (!taskId || taskId === 'undefined' || taskId === 'null') {
            uni.showToast({
              title: '任务ID不存在',
              icon: 'none'
            })
            return
          }
          try {
            this.deletingTaskId = taskId
            uni.showLoading({ title: '删除中...' })
            const resp = await deleteTask(taskId)
            if (resp && (resp.code === 200 || resp.code === 0)) {
              uni.showToast({
                title: '删除成功',
                icon: 'success'
              });
              // 重新加载任务列表
              await this.fetchProjectTasks();
            } else {
              uni.showToast({
                title: (resp && (resp.msg || resp.message)) || '删除失败',
                icon: 'none'
              })
            }
          } catch (e) {
            uni.showToast({
              title: e?.msg || e?.message || '删除失败',
              icon: 'none'
            })
          } finally {
            uni.hideLoading()
            this.deletingTaskId = null
          }
        }
      })
    },

    handleTaskTouchStart(task, e) {
      const t = (e && e.touches && e.touches[0]) ? e.touches[0] : null
      this.taskTouchStartX = t ? (t.pageX || t.clientX || 0) : 0
      this.taskTouchStartY = t ? (t.pageY || t.clientY || 0) : 0
      this.taskTouchMoved = false
      this.taskTouchMovedTaskId = String(task.id || '')
    },

    handleTaskTouchMove(task, e) {
      if (this.taskTouchMovedTaskId && String(this.taskTouchMovedTaskId) !== String(task.id || '')) {
        return
      }
      const t = (e && e.touches && e.touches[0]) ? e.touches[0] : null
      const x = t ? (t.pageX || t.clientX || 0) : 0
      const y = t ? (t.pageY || t.clientY || 0) : 0
      const dx = Math.abs(x - this.taskTouchStartX)
      const dy = Math.abs(y - this.taskTouchStartY)
      if (dx > 10 || dy > 10) {
        this.taskTouchMoved = true
      }
    },

    handleTaskTouchEnd(task) {
      if (this.taskTouchMovedTaskId && String(this.taskTouchMovedTaskId) !== String(task.id || '')) {
        return
      }
      this.taskTouchStartX = 0
      this.taskTouchStartY = 0
      this.taskTouchMoved = false
      this.taskTouchMovedTaskId = null
    },
    // 创建新任务
    createTask() {
      if (this.isArchived) {
        uni.showToast({
          title: '项目已归档，不能新建任务',
          icon: 'none'
        });
        return;
      }
      // 跳转到任务创建页面
      uni.navigateTo({
        url: `/pages/task/TaskCreate?projectId=${this.projectId}`
      });
    },
    editTask(task) {
      if (!this.canEditTask(task)) {
        uni.showToast({
          title: '只有任务创建人可以编辑任务',
          icon: 'none'
        });
        return;
      }
      if (this.isArchived) {
        uni.showToast({
          title: '项目已归档，不能编辑任务',
          icon: 'none'
        });
        return;
      }
      // 获取原始任务ID并转换为字符串，避免长整型精度丢失
      const rawTask = task.rawTask || task;
      const taskId = String(rawTask.id || task.id || '');
      if (!taskId || taskId === 'undefined' || taskId === 'null') {
        uni.showToast({
          title: '任务ID不存在',
          icon: 'none'
        });
        return;
      }
      // 跳转到任务编辑页面
      uni.navigateTo({
        url: `/pages/task/TaskCreate?taskId=${taskId}&projectId=${this.projectId}&mode=edit`
      });
    },
    // 打开分配任务弹窗
    openAssignTaskModal(task) {
      if (!this.canAssignTask(task)) {
        uni.showToast({
          title: '只有项目负责人或管理员可以分配任务',
          icon: 'none'
        });
        return;
      }
      this.taskToAssign = task.rawTask || task;
      // 初始化选中成员为当前任务的执行者
      this.selectedMembers = [];
      if (this.taskToAssign && this.taskToAssign.assignees && Array.isArray(this.taskToAssign.assignees)) {
        this.selectedMembers = this.taskToAssign.assignees.map(a => a.userId || a.id);
      }
      this.$refs.assignPopup.open();
    },
    // 关闭分配任务弹窗
    closeAssignTaskModal() {
      this.$refs.assignPopup.close();
      this.taskToAssign = null;
      this.selectedMembers = [];
    },
    // 切换成员选择
    toggleMemberSelect(member) {
      const memberId = member.userId || member.id;
      const index = this.selectedMembers.indexOf(memberId);
      if (index > -1) {
        this.selectedMembers.splice(index, 1);
      } else {
        // 检查是否超过任务需要人数
        if (this.taskToAssign && this.taskToAssign.requiredPeople && this.selectedMembers.length >= this.taskToAssign.requiredPeople) {
          uni.showToast({
            title: `任务最多需要${this.taskToAssign.requiredPeople}人`,
            icon: 'none'
          });
          return;
        }
        this.selectedMembers.push(memberId);
      }
    },
    // 检查成员是否已选中
    isMemberSelected(member) {
      const memberId = member.userId || member.id;
      return this.selectedMembers.indexOf(memberId) > -1;
    },
    // 确认分配
    async confirmAssign() {
      if (this.selectedMembers.length === 0 || this.assigning) return;

      // 获取原始任务ID（确保使用字符串格式）
      const rawTask = this.taskToAssign.rawTask || this.taskToAssign;
      const taskId = String(rawTask.id || this.taskToAssign.id || '');

      if (!taskId || taskId === 'undefined' || taskId === 'null') {
        uni.showToast({
          title: '任务ID不存在',
          icon: 'none'
        });
        return;
      }

      try {
        this.assigning = true;
        const { assignTask } = await import('@/api/task.js');
        console.log('[confirmAssign] 分配任务，任务ID:', taskId, '成员:', this.selectedMembers);
        const res = await assignTask(taskId, this.selectedMembers);

        if (res && (res.code === 200 || res.code === 0)) {
          uni.showToast({
            title: '分配任务成功',
            icon: 'success'
          });
          try {
            await sendAssignPushToMembers(this.taskToAssign, this.selectedMembers, this.projectId)
          } catch (e) {
            console.error('[confirmAssign] push failed:', e)
          }
          this.closeAssignTaskModal();
          // 重新加载任务列表
          await this.fetchProjectTasksSilent();
        } else {
          uni.showToast({
            title: (res && (res.msg || res.message)) || '分配任务失败',
            icon: 'none'
          });
        }
      } catch (e) {
        console.error('分配任务失败:', e);
        uni.showToast({
          title: e.message || '分配任务失败',
          icon: 'none'
        });
      } finally {
        this.assigning = false;
      }
    },
    // 接取任务
    async handleClaimTask(task) {
      if (!this.canClaimTask(task)) {
        uni.showToast({
          title: '无法接取此任务',
          icon: 'none'
        });
        return;
      }

      // 获取原始任务ID（确保使用字符串格式，避免长整型精度问题）
      const rawTask = task.rawTask || task;
      const taskId = String(rawTask.id || task.id || '');

      if (!taskId || taskId === 'undefined' || taskId === 'null') {
        uni.showToast({
          title: '任务ID不存在',
          icon: 'none'
        });
        return;
      }

      try {
        const { claimTask } = await import('@/api/task.js');
        console.log('[handleClaimTask] 接取任务，任务ID:', taskId, '原始任务:', rawTask);
        const res = await claimTask(taskId);

        if (res && (res.code === 200 || res.code === 0)) {
          uni.showToast({
            title: '接取任务成功',
            icon: 'success'
          });
          try {
            await sendClaimPushToCreator(rawTask, this.projectId)
          } catch (e) {
            console.error('[handleClaimTask] push failed:', e)
          }
          // 重新加载任务列表
          await this.fetchProjectTasksSilent();
        } else {
          uni.showToast({
            title: (res && (res.msg || res.message)) || '接取任务失败',
            icon: 'none',
            duration: 2000
          });
        }
      } catch (e) {
        console.error('接取任务失败:', e);
        const errorMsg = e?.msg || e?.message || (typeof e === 'string' ? e : '接取任务失败');
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
      }
    },
    // 打开任务提交页面
    openTaskSubmission(task) {
      const rawTask = task.rawTask || task;
      if (!this.isCurrentUserAssignee(task)) {
        uni.showToast({
          title: '只有任务执行者才能提交任务',
          icon: 'none'
        });
        return;
      }
      // 使用原始任务ID并转换为字符串，避免长整型精度丢失
      const taskId = String(rawTask.id || task.id || '');
      if (!taskId || taskId === 'undefined' || taskId === 'null') {
        uni.showToast({
          title: '任务ID不存在',
          icon: 'none'
        });
        return;
      }
      // 跳转到任务提交页面
      uni.navigateTo({
        url: `/pages/task/TaskSubmission?taskId=${taskId}&projectId=${this.projectId}`
      });
    }
  }
};
</script>

<style lang="scss" scoped>
@import '@/static/styles/ProjectDetail.scss';
</style>

