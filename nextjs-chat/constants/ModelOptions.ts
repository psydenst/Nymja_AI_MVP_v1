// nextjschat/constants/modelOptions.ts

export interface ModelOption {
  key: string
  label: string
}

export const MODEL_OPTIONS: ModelOption[] = [
  { key: 'gemma',      label: 'Gemma 3 27B' },
  { key: 'mistral',    label: 'Mistral Nemo 12B' },
  { key: 'llama',      label: 'Llama 3.2-11B Vision' },
  { key: 'dolphin',    label: 'Dolphin 3.0 (Mistral 24B)' },
  { key: 'deephermes', label: 'Nous DeepHermes 3 8B' },
  { key: 'qwen',       label: 'Qwen QWQ 32B' },
  { key: 'deepseek',   label: 'DeepSeek V3 65B' },
  { key: 'kimi',       label: 'Kimi Dev 72B' },
]
