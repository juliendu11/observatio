<template>
  <Toaster rich-colors :duration="10000" />
  <div
    class="layout"
    :class="{
      'show-drawer': toggleDrawer,
    }"
  >
    <header
      class="py-3 px-3 fixed top-0 left-0 w-full bg-base-200 z-40 flex justify-between items-center"
    >
      <button class="btn btn-square" @click="toggleDrawer = !toggleDrawer">
        <Bars3Icon class="h-5 w-5" />
      </button>
    </header>
    <aside class="bg-base-200">
      <ul class="flex flex-col items-center py-4 gap-4">
        <li>
          <Link
            class="btn btn-square"
            :class="{ 'btn-primary': currentPath === '/cameras' }"
            href="/cameras"
            prefetch
          >
            <CameraIcon class="h-5 w-5" />
          </Link>
        </li>
        <li>
          <Link
            class="btn btn-square"
            :class="{ 'btn-primary': currentPath === '/metrics' }"
            href="/metrics"
          >
            <ChartBarIcon class="h-5 w-5" />
          </Link>
        </li>
        <li>
          <Link
            class="btn btn-square"
            href="/logs"
            :class="{ 'btn-primary': currentPath === '/logs' }"
            prefetch
          >
            <DocumentIcon class="h-5 w-5" />
          </Link>
        </li>
        <AuthorityWrapper :value="Permissions.ADD_USER">
          <li>
            <Link
              class="btn btn-square"
              href="/users"
              :class="{ 'btn-primary': currentPath === '/users' }"
              prefetch
            >
              <UsersIcon class="h-5 w-5" />
            </Link>
          </li>
        </AuthorityWrapper>
        <AuthorityWrapper :value="Permissions.UPDATE_SETTINGS">
          <li>
            <Link
              class="btn btn-square"
              href="/alerts"
              :class="{ 'btn-primary': currentPath === '/alerts' }"
              prefetch
            >
              <BellIcon class="h-5 w-5" />
            </Link>
          </li>
        </AuthorityWrapper>
      </ul>

      <ul class="flex flex-col items-center gap-4 py-4">
        <li>
          <ThemeSwitcher />
        </li>
        <li>
          <LanguageSwicther />
        </li>
        <li>
          <Link class="btn btn-square" href="/logout" method="delete">
            <ArrowLeftEndOnRectangleIcon class="h-5 w-5" />
          </Link>
        </li>
      </ul>
    </aside>
    <main>
      <div class="px-5 py-4 pt-8">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { Link, usePage } from '@inertiajs/vue3'
import {
  CameraIcon,
  UsersIcon,
  ChartBarIcon,
  DocumentIcon,
  BellIcon,
  ArrowLeftEndOnRectangleIcon,
  Bars3Icon,
} from '@heroicons/vue/24/outline'
import LanguageSwicther from '~/components/language-swicther.vue'
import ThemeSwitcher from '~/components/theme-switcher.vue'
import { useTransmitClient } from '~/composables/useServices'
import { computed, ref } from 'vue'
import { Toaster } from 'vue-sonner'
import { PageProps } from '#config/inertia'
import AuthorityWrapper from '~/components/authority-wrapper.vue'
import { Permissions } from '#enums/Permissions'

const page = usePage<PageProps>()
const transmitClient = useTransmitClient()
const currentPath = computed(() => page?.props?.route?.pattern ?? '')

const toggleDrawer = ref(true)

transmitClient.connect()
</script>

<style>
.layout {
  --initial-drawer-width: 70px;

  --drawer-width: 0;
  --navbar-height: 70px;
}

.layout.show-drawer {
  --drawer-width: var(--initial-drawer-width);

  aside {
    transform: translateX(0);
  }

  header {
    transform: translateX(var(--drawer-width));
  }
}

main {
  padding-top: var(--navbar-height);
  padding-left: var(--drawer-width);
}

aside {
  position: fixed;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--drawer-width);
  z-index: 50;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transform: translateX(calc(0px - var(--initial-drawer-width)));
}

header {
  height: var(--navbar-height);
  transform: translateX(0);
}
</style>
