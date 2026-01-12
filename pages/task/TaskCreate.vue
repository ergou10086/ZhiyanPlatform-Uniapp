<template>
  <view class="task-create-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-left" @click="goBack">
          <uni-icons type="left" size="20" color="#333"></uni-icons>
        </view>
        <view class="navbar-title">{{ isEditMode ? '编辑任务' : '发布任务' }}</view>
        <view class="navbar-right"></view>
      </view>
    </view>

    <!-- 页面内容 -->
    <scroll-view class="content" scroll-y>
      <loading-spinner v-if="loading" :overlay="true" />
      
      <view v-else class="form-container">
        <!-- 任务标题 -->
        <view class="form-item">
          <view class="form-label">
            <text>任务标题</text>
            <text class="required">*</text>
          </view>
          <input
            v-model="formData.title"
            type="text"
            placeholder="请输入任务标题"
            maxlength="50"
            class="form-input"
          />
        </view>

        <!-- 任务描述 -->
        <view class="form-item">
          <view class="form-label">
            <text>任务描述</text>
          </view>
          <textarea
            v-model="formData.description"
            placeholder="请输入任务描述（选填）"
            maxlength="200"
            class="form-textarea"
            :auto-height="true"
          />
        </view>

        <!-- 截止日期 -->
        <view class="form-item">
          <view class="form-label">
            <text>截止日期</text>
          </view>
          <picker
            mode="date"
            :value="formData.dueDate"
            :start="minDate"
            @change="onDateChange"
          >
            <view class="picker-view">
              <text :class="formData.dueDate ? 'picker-text' : 'picker-placeholder'">
                {{ formData.dueDate || '请选择截止日期（选填）' }}
              </text>
              <uni-icons type="calendar" size="18" color="#999"></uni-icons>
            </view>
          </picker>
        </view>

        <!-- 优先级 -->
        <view class="form-item">
          <view class="form-label">
            <text>优先级</text>
          </view>
          <picker
            mode="selector"
            :range="priorityOptions"
            :range-key="'label'"
            :value="priorityIndex"
            @change="onPriorityChange"
          >
            <view class="picker-view">
              <text class="picker-text">{{ priorityOptions[priorityIndex].label }}</text>
              <uni-icons type="arrowdown" size="16" color="#999"></uni-icons>
            </view>
          </picker>
        </view>

        <!-- 任务人数 -->
        <view class="form-item">
          <view class="form-label">
            <text>任务人数</text>
            <text class="label-tip">(可参加的成员数量)</text>
          </view>
          <input
            v-model.number="formData.requiredPeople"
            type="number"
            placeholder="请输入可参加的成员数量（默认1人）"
            min="1"
            class="form-input"
          />
        </view>

        <!-- 里程碑任务 -->
        <view class="form-item form-item-switch">
          <view class="form-label">
            <text>里程碑任务</text>
          </view>
          <switch
            :checked="formData.isMilestone"
            @change="onMilestoneChange"
            color="#3b6ff5"
          />
        </view>
      </view>

      <!-- 提交按钮 -->
      <view class="submit-section">
        <button
          class="submit-btn"
          :class="{ 'submit-btn--disabled': !canSubmit || submitting }"
          :disabled="!canSubmit || submitting"
          @click="handleSubmit"
        >
          {{ submitting ? (isEditMode ? '保存中...' : '发布中...') : (isEditMode ? '保存' : '发布任务') }}
        </button>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import { createTask, updateTask, getTaskDetail } from '@/api/task.js'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

export default {
  components: { LoadingSpinner },
  name: 'TaskCreate',
  data() {
    return {
      projectId: '',
      taskId: '',
      isEditMode: false,
      loading: false,
      submitting: false,
      formData: {
        title: '',
        description: '',
        dueDate: '',
        priority: 'MEDIUM',
        requiredPeople: 1,
        isMilestone: false
      },
      priorityOptions: [
        { label: '高', value: 'HIGH' },
        { label: '中', value: 'MEDIUM' },
        { label: '低', value: 'LOW' }
      ],
      priorityIndex: 1, // 默认选中"中"
      minDate: '' // 最小日期（今天）
    }
  },
  computed: {
    canSubmit() {
      return this.formData.title.trim().length > 0 && !this.submitting
    }
  },
  async onLoad(options) {
    if (options && options.projectId) {
      this.projectId = options.projectId
    }
    
    // 判断是否为编辑模式
    if (options && options.taskId && options.mode === 'edit') {
      this.isEditMode = true
      this.taskId = String(options.taskId)
      await this.loadTaskData()
    }
    
    // 设置最小日期为今天
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    this.minDate = `${year}-${month}-${day}`
  },
  methods: {
    async loadTaskData() {
      if (!this.taskId || !this.projectId) {
        return
      }
      
      this.loading = true
      try {
        const task = await getTaskDetail(this.taskId, this.projectId)
        
        if (task && (task.code === 200 || task.code === 0 || task.id)) {
          // 填充表单数据
          this.formData.title = task.title || ''
          this.formData.description = task.description || ''
          this.formData.dueDate = task.dueDate || ''
          this.formData.requiredPeople = task.requiredPeople || 1
          this.formData.isMilestone = task.isMilestone || false
          
          // 设置优先级
          const priority = String(task.priority || 'MEDIUM').toUpperCase()
          const priorityIndex = this.priorityOptions.findIndex(p => p.value === priority)
          if (priorityIndex >= 0) {
            this.priorityIndex = priorityIndex
            this.formData.priority = priority
          } else {
            this.priorityIndex = 1
            this.formData.priority = 'MEDIUM'
          }
        } else {
          uni.showToast({
            title: '获取任务信息失败',
            icon: 'none'
          })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        }
      } catch (error) {
        console.error('加载任务数据失败:', error)
        uni.showToast({
          title: '加载任务信息失败',
          icon: 'none'
        })
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      } finally {
        this.loading = false
      }
    },
    goBack() {
      uni.navigateBack()
    },
    onDateChange(e) {
      this.formData.dueDate = e.detail.value
      // 验证日期不能早于今天
      if (this.formData.dueDate && new Date(this.formData.dueDate) < new Date(this.minDate)) {
        uni.showToast({
          title: '截止日期不能早于今天',
          icon: 'none'
        })
        this.formData.dueDate = ''
      }
    },
    onPriorityChange(e) {
      this.priorityIndex = e.detail.value
      this.formData.priority = this.priorityOptions[e.detail.value].value
    },
    onMilestoneChange(e) {
      this.formData.isMilestone = e.detail.value
    },
    async handleSubmit() {
      if (!this.canSubmit) {
        return
      }

      // 验证截止日期
      if (this.formData.dueDate && new Date(this.formData.dueDate) < new Date(this.minDate)) {
        uni.showToast({
          title: '截止日期不能早于今天',
          icon: 'none'
        })
        return
      }

      this.submitting = true

      try {
        if (this.isEditMode) {
          // 编辑模式：更新任务
          const updateData = {
            title: this.formData.title.trim(),
            description: this.formData.description.trim() || '',
            priority: this.formData.priority,
            dueDate: this.formData.dueDate || null,
            requiredPeople: this.formData.requiredPeople || 1,
            isMilestone: this.formData.isMilestone || false
          }

          const response = await updateTask(this.taskId, updateData)

          if (response && (response.code === 200 || response.code === 0)) {
            uni.showToast({
              title: '任务更新成功',
              icon: 'success'
            })
            
            // 延迟返回，让用户看到成功提示
            setTimeout(() => {
              uni.navigateBack()
            }, 1500)
          } else {
            uni.showToast({
              title: response?.msg || response?.message || '更新任务失败',
              icon: 'none',
              duration: 2000
            })
          }
        } else {
          // 创建模式：新建任务
          const taskData = {
            projectId: this.projectId,
            title: this.formData.title.trim(),
            description: this.formData.description.trim() || '',
            priority: this.formData.priority,
            dueDate: this.formData.dueDate || null,
            assigneeIds: [], // 新任务默认没有执行者
            requiredPeople: this.formData.requiredPeople || 1,
            isMilestone: this.formData.isMilestone || false
          }

          const response = await createTask(taskData)

          if (response && (response.code === 200 || response.code === 0)) {
            uni.showToast({
              title: '任务创建成功',
              icon: 'success'
            })
            
            // 延迟返回，让用户看到成功提示
            setTimeout(() => {
              uni.navigateBack()
            }, 1500)
          } else {
            uni.showToast({
              title: response?.msg || response?.message || '创建任务失败',
              icon: 'none',
              duration: 2000
            })
          }
        }
      } catch (error) {
        console.error(this.isEditMode ? '更新任务失败:' : '创建任务失败:', error)
        const errorMsg = error?.msg || error?.message || (this.isEditMode ? '更新任务失败，请稍后重试' : '创建任务失败，请稍后重试')
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/static/styles/TaskCreate.scss';
</style>

