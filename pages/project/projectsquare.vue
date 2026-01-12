<template>
  <view class="page">
    <!-- 顶部导航栏（自定义，包含状态栏高度） -->
    <view class="navbar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <text class="nav-title">项目广场</text>
    </view>

    <!-- 搜索 + 筛选区域（玻璃卡片样式） -->
    <view class="search-filter-wrapper">
      <view class="search-card">
        <view class="search-box">
          <text class="search-icon">🔍</text>
          <input
            class="search-input"
            type="text"
            v-model="searchKeyword"
            placeholder="搜索项目名称或关键词"
            placeholder-class="search-placeholder"
            confirm-type="search"
            @confirm="onSearch"
          />
        </view>

        <view class="filter-btn" @tap="onFilter">
          <view class="filter-btn-inner">
            <text class="filter-icon">☰</text>
            <text class="filter-text">筛选</text>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 筛选菜单 -->
    <view v-if="showFilterMenu" class="filter-menu" @tap.stop>
      <view class="filter-menu-inner">
        <view class="filter-menu-item" :class="{ active: selectedStatus === '' }" @tap="selectStatus('')">
          <text>全部状态</text>
        </view>
        <view class="filter-menu-item" :class="{ active: selectedStatus === 'ongoing' }" @tap="selectStatus('ongoing')">
          <text>进行中</text>
        </view>
        <view class="filter-menu-item" :class="{ active: selectedStatus === 'completed' }" @tap="selectStatus('completed')">
          <text>已完成</text>
        </view>
        <view class="filter-menu-item" @tap="clearFilter">
          <text>清空筛选</text>
        </view>
      </view>
    </view>
    
    <!-- 筛选菜单遮罩层 -->
    <view v-if="showFilterMenu" class="filter-overlay" @tap="onFilter"></view>

    <!-- 项目列表 -->
    <scroll-view class="list-scroll" :style="{ height: scrollHeight + 'px' }" scroll-y :scroll-top="scrollTop" @scrolltolower="loadMore" enhanced :show-scrollbar="showScrollbar">
      <view
        class="project-card"
        v-for="item in filteredProjectList"
        :key="item.id"
        @tap="onProjectClick(item)"
      >
        <view class="card-main">
          <view class="card-cover-wrap">
            <image class="card-cover" :src="item.cover" mode="aspectFill" />
            <view class="card-cover-overlay"></view>
          </view>
          <view class="card-content">
            <text class="card-title">{{ truncateProjectTitle(item.title) }}</text>

            <view class="meta-row">
              <text class="meta-label">项目日期：</text>
              <text class="meta-text">{{ item.startDate }} 至 {{ item.endDate }}</text>
            </view>

            <view class="meta-row">
              <text class="meta-label">项目状态：</text>
              <view class="status-tag" :class="'status-' + item.status">
                <view class="status-dot"></view>
                <text class="status-text">{{ item.statusText }}</text>
              </view>
            </view>

            <view class="meta-footer">
              <text class="time-text">{{ item.timeAgo }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部留白避免被悬浮按钮遮挡 -->
      <view class="bottom-spacer" />
    </scroll-view>
  </view>
</template>

<script>
import { getMyProjects } from '@/api/project.js'
import config from '@/utils/config.js'

export default {
  data() {
    return {
      statusBarHeight: 0, // 状态栏高度
      searchKeyword: '',
      projectList: [],
      allProjectList: [], // 保存所有项目列表（用于搜索和筛选）
      loading: false,
      selectedStatus: '', // 选中的状态筛选
      showFilterMenu: false, // 是否显示筛选菜单
      scrollHeight: 0, // 滚动容器高度
      scrollTop: 0, // 滚动位置
      showScrollbar: true // 是否显示滚动条
    };
  },
  computed: {
    // 过滤后的项目列表
    filteredProjectList() {
      let list = this.allProjectList;
      
      // 过滤掉已归档的项目
      list = list.filter(item => {
        return item.status !== 'archived';
      });
      
      // 搜索过滤
      if (this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.trim().toLowerCase();
        list = list.filter(item => {
          return (item.title || '').toLowerCase().includes(keyword)
        });
      }
      
      // 状态筛选
      if (this.selectedStatus) {
        list = list.filter(item => {
          return item.status === this.selectedStatus;
        });
      }
      
      return list;
    },
    // 动态计算是否需要显示滚动条
    showScrollbar() {
      return this.filteredProjectList.length > 3; // 超过3个项目时显示滚动条
    }
  },
  onLoad() {
    this.getSystemInfo();
    this.fetchMyProjects();
    this.calculateScrollHeight();
  },
  methods: {
    // 获取系统信息（用于设置状态栏高度）
    getSystemInfo() {
      try {
        const systemInfo = uni.getSystemInfoSync();
        this.statusBarHeight = systemInfo.statusBarHeight || 0;
      } catch (e) {
        console.error('获取系统信息失败:', e);
        this.statusBarHeight = 20;
      }
    },
    async fetchMyProjects() {
      try {
        this.loading = true;
        const res = await getMyProjects(0, 50);

        if (res && (res.code === 200 || res.code === 0)) {
          let list = [];

          if (Array.isArray(res.content)) {
            // R<Page<Project>> 展开的情况：content 直接在顶层
            list = res.content;
          } else if (res.data && Array.isArray(res.data.content)) {
            // 兼容如果后端返回在 data 里再包一层 Page
            list = res.data.content;
          } else if (Array.isArray(res.data)) {
            list = res.data;
          }

          // 调试：打印从后端返回的原始项目列表
          console.log('我的项目原始列表:', list);

          const mappedList = list.map(p => {
            // 处理封面图片，和详情页保持一致逻辑
            let rawCover = p.imageUrl || p.image || '';
            // 如果是完整的HTTP/HTTPS URL（COS URL），直接使用
            if (rawCover && (rawCover.startsWith('http://') || rawCover.startsWith('https://'))) {
              // 已经是完整URL，直接使用
            } else if (rawCover && rawCover.startsWith('/zhiyan/projects/') && (rawCover.endsWith('/image') || rawCover.includes('/image'))) {
              // 如果是后端接口路径（如 /zhiyan/projects/{id}/image），在手机端无法正确处理302重定向
              // 这种情况应该使用占位图，因为拼接baseURL后仍然会返回302重定向，手机端无法处理
              console.warn('[ProjectSquare] 项目图片URL是后端接口路径，手机端无法正确处理，使用占位图:', rawCover);
              rawCover = '';
            } else if (rawCover && rawCover.startsWith('/')) {
              // 其他相对路径（以 / 开头），拼接baseURL
              rawCover = config.baseURL + rawCover;
            } else if (rawCover) {
              // 其他情况（如相对路径但不以 / 开头），拼接baseURL
              rawCover = config.baseURL + rawCover;
            }

            return {
              // 优先使用后端提供的字符串ID，避免长整型在JS中精度丢失
              id: p.idStr || p.id,
              title: p.name || p.title || '未命名项目',
              cover: rawCover,

              startDate: p.startDate || '',
              endDate: p.endDate || '',
              status: this.mapProjectStatus(p.status || 'ONGOING'),
              statusText: this.getStatusText(p.status || 'ONGOING'),
              category: p.category || '未分类',
              timeAgo: ''
            };
          });
          
          // 保存到 allProjectList 和 projectList
          this.allProjectList = mappedList;
          this.projectList = mappedList;
        } else {
          uni.showToast({
            title: (res && (res.msg || res.message)) || '获取项目列表失败',
            icon: 'none'
          });
        }
      } catch (e) {
        console.error('获取我的项目失败:', e);
        uni.showToast({
          title: e.message || '获取项目列表失败',
          icon: 'none'
        });
      } finally {
        this.loading = false;
      }
    },

    onSearch() {
      // 搜索功能已通过 computed 属性 filteredProjectList 实现
      // 这里可以添加其他逻辑，如清空筛选等
      console.log('搜索关键词:', this.searchKeyword);
    },
    onFilter() {
      // 切换筛选菜单显示
      this.showFilterMenu = !this.showFilterMenu;
    },
    selectStatus(status) {
      // 选择状态筛选
      this.selectedStatus = status;
      this.showFilterMenu = false;
    },
    clearFilter() {
      // 清空筛选
      this.selectedStatus = '';
      this.searchKeyword = '';
      this.showFilterMenu = false;
    },
    // 映射项目状态
    mapProjectStatus(status) {
      if (!status) return 'ongoing';
      const statusStr = String(status).toUpperCase();
      const statusMap = {
        'ONGOING': 'ongoing',
        '进行中': 'ongoing',
        'COMPLETED': 'completed',
        '已完成': 'completed',
        'RECRUIT': 'recruit',
        '招募中': 'recruit',
        'ARCHIVED': 'archived',
        '已归档': 'archived'
      };
      return statusMap[statusStr] || 'ongoing';
    },
    // 获取状态文本
    getStatusText(status) {
      if (!status) return '进行中';
      const statusStr = String(status).toUpperCase();
      const textMap = {
        'ONGOING': '进行中',
        'COMPLETED': '已完成',
        'RECRUIT': '招募中'
      };
      return textMap[statusStr] || '进行中';
    },
    onProjectClick(item) {
      uni.navigateTo({
        url: `/pages/project/ProjectDetail?id=${item.id}`
      });
    },
    truncateProjectTitle(title) {
      const t = String(title || '')
      if (t.length <= 11) return t
      return t.substring(0, 11) + '...'
    },
    // 计算滚动容器高度
    calculateScrollHeight() {
      try {
        const systemInfo = uni.getSystemInfoSync();
        const windowHeight = systemInfo.windowHeight || systemInfo.screenHeight;
        const navHeight = 44 + this.statusBarHeight; // 导航栏高度 + 状态栏高度
        const searchHeight = 80; // 搜索区域高度估算
        this.scrollHeight = windowHeight - navHeight - searchHeight;
      } catch (e) {
        console.error('计算滚动高度失败:', e);
        this.scrollHeight = 400; // 默认高度
      }
    },
    onCreate() {
      // 创建/发布项目（预留入口，暂时只做日志输出）
      console.log('create project');
    }
  }
};
</script>

<style scoped>
@import '@/static/styles/projectsquare.scss';
</style>