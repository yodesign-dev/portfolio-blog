'use client'

/**
 * This configuration is used to for the Sanity Studio that’s mounted on the `/app/studio/[[...tool]]/page.tsx` route
 */

import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {presentationTool} from 'sanity/presentation'
import {table} from '@sanity/table'

import {apiVersion, dataset, projectId} from './src/sanity/env'
import {schema} from './src/sanity/schemaTypes'
import {structure} from './src/sanity/structure'
import {resolve} from './src/sanity/presentation/resolve'

export default defineConfig({
  basePath: '/studio',
  projectId,
  dataset,
  schema,
  plugins: [
    structureTool({structure}),
    visionTool({defaultApiVersion: apiVersion}),
    table(),
    // MỚI: Presentation Tool — cho phép viết bài và xem preview live ngay
    // trên giao diện thật của site, click vào text/ảnh để nhảy thẳng đến
    // đúng field trong Studio. Không cần `previewUrl.origin` vì Studio
    // đang chạy chung app với site (embedded), nên tự dùng đúng domain
    // hiện tại (localhost lúc dev, applebin.me lúc production).
    presentationTool({
      resolve,
      previewUrl: {
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
    }),
  ],
})
