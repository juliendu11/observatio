<template>
  <Head :title="t('users.title')" />

  <div class="space-y-6">
    <h1 class="text-3xl font-bold text-center">{{ t('users.organizationTitle') }}</h1>

    <div class="card bg-base-200">
      <div class="card-body">
        <h2 class="card-title">{{ t('users.organizationTitle') }}</h2>

        <div class="overflow-x-auto">
          <table class="table table-zebra">
            <thead>
              <tr>
                <th>{{ t('users.table.email') }}</th>
                <th>{{ t('users.table.generalPermissions') }}</th>
                <th>{{ t('users.table.cameraPermissions') }}</th>
                <th v-if="currentUser.isManager">{{ t('users.table.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.email }}</td>
                <td>
                  <span v-if="user.isManager" class="badge badge-sm badge-primary">{{
                    t('users.table.allPermissions')
                  }}</span>
                  <div v-else class="flex flex-wrap gap-1">
                    <span
                      v-for="perm in user.permissions"
                      :key="perm.id"
                      class="badge badge-sm badge-primary"
                    >
                      {{ perm.permission.name }}
                    </span>
                  </div>
                </td>
                <td>
                  <span v-if="user.isManager" class="badge badge-sm badge-accent">{{
                    t('users.table.allPermissions')
                  }}</span>
                  <div v-else class="flex flex-col gap-1">
                    <div
                      v-for="cameraPerm in groupCameraPermissions(user.cameraPermissions)"
                      :key="cameraPerm.cameraId"
                      class="text-sm"
                    >
                      <span class="font-semibold">{{ cameraPerm.cameraLabel }}:</span>
                      <span class="ml-2">
                        <span
                          v-for="perm in cameraPerm.permissions"
                          :key="perm"
                          class="badge badge-xs badge-accent ml-1"
                        >
                          {{ perm }}
                        </span>
                      </span>
                    </div>
                  </div>
                </td>
                <td v-if="currentUser.isManager">
                  <button
                    v-if="user.id !== currentUser.id"
                    @click="deleteUser(user.id)"
                    class="btn btn-sm btn-error"
                  >
                    {{ t('common.delete') }}
                  </button>
                  <span v-else class="text-sm text-gray-500">{{ t('common.you') }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="card bg-base-200">
      <div class="card-body">
        <h2 class="card-title">{{ t('users.addUser') }}</h2>

        <form @submit.prevent="form.post('/users')" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BaseFormInput
              v-model="form.email"
              :label="t('users.form.email')"
              type="email"
              :error="form.errors.email"
              data-testid="emailInput"
            />
            <BaseFormInput
              v-model="form.password"
              :label="t('users.form.password')"
              type="password"
              :error="form.errors.password"
              data-testid="passwordInput"
            />
          </div>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input
                v-model="form.canAddCamera"
                type="checkbox"
                class="checkbox checkbox-primary"
                data-testid="canAddCameraCheckbox"
              />
              <span class="label-text font-semibold">{{ t('users.form.canAddCamera') }}</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input
                v-model="form.canAddUser"
                type="checkbox"
                class="checkbox checkbox-primary"
                data-testid="canAddUserCheckbox"
              />
              <span class="label-text font-semibold">{{ t('users.form.canAddUser') }}</span>
            </label>
          </div>

          <div class="form-control">
            <label class="label cursor-pointer justify-start gap-3">
              <input
                v-model="form.canUpdateSettings"
                type="checkbox"
                class="checkbox checkbox-primary"
                data-testid="canUpdateSettingsCheckbox"
              />
              <span class="label-text font-semibold">{{ t('users.form.canUpdateSettings') }}</span>
            </label>
          </div>

          <div v-if="cameras.length > 0" class="space-y-4">
            <h3 class="text-lg font-semibold">{{ t('users.form.permissionsPerCamera') }}</h3>

            <div v-for="(camera, index) in cameras" :key="camera.id" class="card bg-base-300">
              <div class="card-body py-3">
                <h4 class="font-semibold">{{ camera.label }}</h4>

                <div class="flex flex-wrap gap-4">
                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.cameraPermissions[index].canShow"
                      type="checkbox"
                      class="checkbox checkbox-sm checkbox-accent"
                      data-testid="canViewCameraCheckbox"
                    />
                    <span class="label-text">{{ t('users.form.canView') }}</span>
                  </label>

                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.cameraPermissions[index].canEdit"
                      type="checkbox"
                      class="checkbox checkbox-sm checkbox-accent"
                      data-testid="canEditCameraCheckbox"
                    />
                    <span class="label-text">{{ t('users.form.canEdit') }}</span>
                  </label>

                  <label class="label cursor-pointer justify-start gap-2">
                    <input
                      v-model="form.cameraPermissions[index].canDelete"
                      type="checkbox"
                      class="checkbox checkbox-sm checkbox-accent"
                      data-testid="canDeleteCameraCheckbox"
                    />
                    <span class="label-text">{{ t('users.form.canDelete') }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="flex justify-end pt-4">
            <BaseButton
              color="primary"
              type="submit"
              data-testid="submitButton"
              :is-loading="form.processing"
            >
              {{ t('users.form.submit') }}
            </BaseButton>
          </div>
        </form>
      </div>
    </div>
  </div>
  <dialog ref="confirmModal" class="modal">
    <div class="modal-box">
      <h3 class="text-lg font-bold">{{ t('users.delete.title') }}</h3>
      <p class="py-4">
        {{ t('users.delete.message') }}
        <span class="font-semibold">{{ userToDelete.email }}</span> ?
      </p>
      <p class="text-sm text-warning">{{ t('users.delete.warning') }}</p>
      <div class="modal-action">
        <form method="dialog" class="flex gap-2">
          <button class="btn btn-ghost">{{ t('users.delete.cancel') }}</button>
          <button @click="onConfirmDeleteUser" class="btn btn-error">
            {{ t('users.delete.confirm') }}
          </button>
        </form>
      </div>
    </div>
  </dialog>
</template>

<script lang="ts" setup>
import { Head, router } from '@inertiajs/vue3'
import BaseFormInput from '~/components/base-form-input.vue'
import { useCreateForm } from '~/composables/useCreateForm'
import { useTemplateRef, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseButton from '~/components/base-button.vue'

const { t } = useI18n()

const props = defineProps<{
  users: any[]
  cameras: any[]
  currentUser: {
    id: number
    email: string
    isManager: boolean
  }
}>()

interface CameraPermission {
  cameraId: number
  canShow: boolean
  canEdit: boolean
  canDelete: boolean
}

const { form } = useCreateForm<{
  email: string
  password: string
  canAddCamera: boolean
  canAddUser: boolean
  canUpdateSettings: boolean
  cameraPermissions: CameraPermission[]
}>({
  email: '',
  password: '',
  canAddCamera: false,
  canAddUser: false,
  canUpdateSettings: false,
  cameraPermissions: props.cameras.map((camera) => ({
    cameraId: camera.id,
    canShow: false,
    canEdit: false,
    canDelete: false,
  })),
})

function groupCameraPermissions(cameraPermissions: any[]) {
  const grouped = new Map()

  for (const perm of cameraPermissions) {
    if (!grouped.has(perm.cameraId)) {
      grouped.set(perm.cameraId, {
        cameraId: perm.cameraId,
        cameraLabel: perm.camera.label,
        permissions: [],
      })
    }
    grouped.get(perm.cameraId).permissions.push(perm.permission.name)
  }

  return Array.from(grouped.values())
}

const confirmModal = useTemplateRef<HTMLDialogElement | null>('confirmModal')
const userToDelete = ref<{ id: number | null; email: string }>({ id: null, email: '' })

function deleteUser(userId: number) {
  const user = props.users.find((u) => u.id === userId)
  if (user) {
    userToDelete.value = { id: user.id, email: user.email }
    confirmModal?.value?.showModal()
  }
}

function onConfirmDeleteUser() {
  if (userToDelete.value.id) {
    router.delete(`/users/${userToDelete.value.id}`)
    confirmModal?.value?.close()
  }
}
</script>
