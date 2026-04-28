'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'
import { TextAlign } from '@tiptap/extension-text-align'
import type { Editor } from '@tiptap/core'

// MUI
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { Stack } from '@mui/material'
import { useTheme } from '@mui/material/styles'

// Icons
import classnames from 'classnames'

import CustomIconButton from '@core/components/mui/IconButton'

// Styles
import '@/libs/styles/tiptapEditor.css'

interface Props {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
}

const EditorToolbar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null

  return (
    <div className='flex flex-wrap gap-x-3 gap-y-1 p-4'>
      <CustomIconButton
        {...(editor.isActive('bold') && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <i className={classnames('ri-bold', { 'text-textSecondary': !editor.isActive('bold') })} />
      </CustomIconButton>

      <CustomIconButton
        {...(editor.isActive('underline') && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <i className={classnames('ri-underline', { 'text-textSecondary': !editor.isActive('underline') })} />
      </CustomIconButton>

      <CustomIconButton
        {...(editor.isActive('italic') && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i className={classnames('ri-italic', { 'text-textSecondary': !editor.isActive('italic') })} />
      </CustomIconButton>

      <CustomIconButton
        {...(editor.isActive('strike') && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <i className={classnames('ri-strikethrough', { 'text-textSecondary': !editor.isActive('strike') })} />
      </CustomIconButton>

      <CustomIconButton
        {...(editor.isActive({ textAlign: 'left' }) && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <i className='ri-align-left' />
      </CustomIconButton>

      <CustomIconButton
        {...(editor.isActive({ textAlign: 'center' }) && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <i className='ri-align-center' />
      </CustomIconButton>

      <CustomIconButton
        {...(editor.isActive({ textAlign: 'right' }) && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <i className='ri-align-right' />
      </CustomIconButton>

      <CustomIconButton
        {...(editor.isActive({ textAlign: 'justify' }) && { color: 'primary' })}
        variant='outlined'
        size='small'
        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
      >
        <i className='ri-align-justify' />
      </CustomIconButton>
    </div>
  )
}

const RichTextEditor = ({
  value = '',
  onChange,
  label = 'Description',
  placeholder = 'Write something here...'
}: Props) => {
  const theme = useTheme()

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Placeholder.configure({ placeholder })
    ],

    content: value,

    onUpdate({ editor }) {
      const html = editor.getHTML()

      onChange?.(html)
    }
  })

  return (
    <Stack>
      <Typography className='' fontSize='0.867em'>
        {label}
      </Typography>

      <Card className='shadow-none border'>
        <CardContent className='p-0'>
          <EditorToolbar editor={editor} />
          <Divider />

          {/* Apply theme background.paper here */}
          <div
            className='max-h-[250px] overflow-y-auto'
            style={{
              backgroundColor: theme.palette.background.paper
            }}
          >
            <EditorContent editor={editor} />
          </div>
        </CardContent>
      </Card>
    </Stack>
  )
}

export default RichTextEditor
