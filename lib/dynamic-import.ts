import dynamic from 'next/dynamic'

export const dynamicImport = (
  importFn: () => Promise<any>,
  options: {
    ssr?: boolean;
    loading?: () => JSX.Element;
  } = {}
) => {
  return dynamic(importFn, {
    ssr: options.ssr ?? true,
    loading: options.loading,
  })
} 