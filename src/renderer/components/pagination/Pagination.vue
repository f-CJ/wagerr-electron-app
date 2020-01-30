<template>
  <div class="pagination-block">      
    <div class="select-wrapper">
      <select style="float:left">
        <option>50</option>
        <option>100</option>
      </select>
    </div>
    <el-pagination
      hide-on-single-page
      background
      layout="prev, pager, next"
      :total="1000">
    </el-pagination>
  </div>
</template>

<script>
import Vuex from 'vuex';

export default {
  name: 'Pagination',

  data() {
    return {};
  },

  computed: {
    ...Vuex.mapGetters([])
  },

  watch: {},

  methods: {
    ...Vuex.mapActions(['']),

  }
};
</script>

<style lang="scss" scoped>
@import '../../assets/scss/_variables.scss';
  .pagination-block {
    text-align:right;

    div.select-wrapper {
      width: 65px;
      display: inline-block;
    }

    div.el-pagination { 
      display: inline-block;
    }
  }
</style>
