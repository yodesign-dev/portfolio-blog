'use client'

/**
 * This configuration is used to for the Sanity Studio that’s mounted on the `/app/studio/[[...tool]]/page.tsx` route
 */

import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
// ⬇️ CẬP NHẬT: import plugin table — bắt buộc phải "npm install @sanity/table" trước
// (nếu chưa cài, Studio sẽ báo lỗi "Cannot find module '@sanity/table'" khi build)
import {table} from '@sanity/table'


// Go to https://www.sanity.io/docs/api-versioning to learn how API versioning works
import {apiVersion, dataset, projectId} from './src/sanity/env'
import {schema} from './src/sanity/schemaTypes'
import {structure} from './src/sanity/structure'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  // Add and edit the content schema in the './sanity/schemaTypes' folder
  schema,
  plugins: [
    structureTool({structure}),
    // Vision is for querying with GROQ from inside the Studio
    // https://www.sanity.io/docs/the-vision-plugin
    visionTool({defaultApiVersion: apiVersion}),
    // ⬇️ CẬP NHẬT: đăng ký plugin table — cho phép field "body" trong post.ts
    // (đã thêm { type: 'table' } vào mảng "of") render được UI tạo bảng trong Studio
    table(),
  ],
})
