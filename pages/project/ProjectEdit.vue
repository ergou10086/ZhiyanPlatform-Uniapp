<template>
  <view class="page">
    <scroll-view class="form-scroll" scroll-y>
      <!-- 封面 -->
      <view class="card">
        <view class="card-title">项目封面</view>
        <view class="cover-wrapper" @tap="chooseCover">
          <image v-if="form.cover" :src="form.cover" class="cover-img" mode="aspectFill" />
          <view v-else class="cover-placeholder">点击选择封面</view>
        </view>
      </view>

      <!-- 基础信息 -->
      <view class="card">
        <view class="card-title">基础信息</view>
        <view class="form-item">
          <view class="label">项目名称</view>
          <input class="input" v-model="form.title" placeholder="请输入项目名称" />
        </view>
        <view class="form-item">
          <view class="label">项目描述</view>
          <textarea
            class="textarea"
            v-model="form.desc"
            placeholder="请输入项目描述"
            auto-height
          ></textarea>
        </view>
        <view class="form-row">
          <view class="form-item half">
            <view class="label">开始日期</view>
            <picker mode="date" :value="form.startDate" @change="onDateChange('startDate', $event)">
              <view class="picker">{{ form.startDate || '请选择' }}</view>
            </picker>
          </view>
          <view class="form-item half">
            <view class="label">结束日期</view>
            <picker mode="date" :value="form.endDate" @change="onDateChange('endDate', $event)">
              <view class="picker">{{ form.endDate || '请选择' }}</view>
            </picker>
          </view>
        </view>
        <view class="form-item">
          <view class="label">当前状态</view>
          <picker :range="statusOptions" :value="statusIndex" @change="onStatusChange">
            <view class="picker">{{ statusOptions[statusIndex] }}</view>
          </picker>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="footer">
        <button class="btn cancel" @tap="onCancel">取消</button>
        <button class="btn save" type="primary" @tap="onSave">保存</button>
      </view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      projectId: '',
      statusOptions: ['进行中', '规划中', '已完成', '暂停'],
      statusIndex: 0,
      form: {
        cover: 'https://dummyimage.com/750x350/edf3ff/3b6ff5&text=Project+Cover',
        title: '糖脂代谢相关的基础科学问题研究',
        desc:
          '本项目旨在深入探讨糖脂代谢过程中关键调控机制，解析其在生理与病理条件下的作用机理。',
        startDate: '2024-01-01',
        endDate: '2025-12-31',
        status: '进行中'
      }
    };
  },
  onLoad(options) {
    this.projectId = options?.id || '';
    // 真实场景下可根据 projectId 拉取详情后填充 form
    const statusIdx = this.statusOptions.indexOf(this.form.status);
    this.statusIndex = statusIdx >= 0 ? statusIdx : 0;
  },
  methods: {
    chooseCover() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          const path = res.tempFilePaths?.[0];
          if (path) this.form.cover = path;
        }
      });
    },
    onDateChange(field, e) {
      this.form[field] = e.detail.value;
    },
    onStatusChange(e) {
      const idx = Number(e.detail.value);
      this.statusIndex = idx;
      this.form.status = this.statusOptions[idx];
    },
    onCancel() {
      uni.navigateBack();
    },
    onSave() {
      // 这里预留实际保存逻辑，如调用接口
      uni.showToast({
        title: '已保存（示例）',
        icon: 'none'
      });
      setTimeout(() => {
        uni.navigateBack();
      }, 500);
    }
  }
};
</script>

<style scoped>
@import '@/static/styles/ProjectEdit.scss';
</style>

