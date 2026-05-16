// import React from 'react'

// import {
//   Box,
//   Button,
//   Card,
//   CardContent,
//   FormControlLabel,
//   IconButton,
//   Radio,
//   RadioGroup,
//   Stack,
//   Switch,
//   TextField,
//   Typography
// } from '@mui/material'
// import { toast } from 'react-toastify'
// import { Add, Delete, RestartAlt } from '@mui/icons-material'
// import IconPicker from 'react-icons-picker'

// import { useDictionary } from '@/contexts/DictionaryContext'
// import { getLockMessage } from '@/utils/miscUtils'
// import ColorPicker from '@/components/widgets/ColorPicker'
// import ImagePicker from '@/components/widgets/ImagePicker'
// import ButtonGroupSelector from '@/components/common/ButtonGroupSelector'
// import type { IFeedback } from '@/types'

// interface FeedbackFormProps {
//   feedback: IFeedback | null
//   setFeedback: React.Dispatch<React.SetStateAction<IFeedback | null>>
//   lockState?: any
// }

// const FeedbackSettings = ({ feedback, setFeedback, lockState }: FeedbackFormProps) => {
//   const dictionary = useDictionary()

//   const fields = [
//     { label: 'Message', key: 'message' },
//     { label: 'Success Message', key: 'successMessage' },
//     { label: 'Button Text', key: 'buttonText' },
//     { label: 'Link', key: 'link' }
//   ] as const

//   const renderImagePicker = (type: 'none' | 'icon' | 'url' | 'image') => {
//     switch (type) {
//       case 'icon':
//         return (
//           <Stack gap={1}>
//             <Typography variant='body2'>{dictionary.icon}</Typography>
//             <Stack direction='row' alignItems='center' gap={2}>
//               <IconPicker
//                 value={feedback?.image || 'TiCancel'}
//                 onChange={(value: string) => setFeedback(prev => ({ ...prev, image: value }))}
//               />
//               {feedback?.image && (
//                 <Button color='error' onClick={() => setFeedback(prev => ({ ...prev, image: undefined }))}>
//                   {dictionary.remove}
//                 </Button>
//               )}
//             </Stack>
//           </Stack>
//         )
//       case 'image':
//         return (
//           <ImagePicker
//             id='image'
//             label={dictionary.image}
//             description={dictionary.linkColor}
//             image={feedback?.image}
//             setImage={(value: string) => setFeedback(prev => ({ ...prev, image: value }))}
//           />
//         )
//       case 'url':
//         return (
//           <TextField
//             variant='standard'
//             size='small'
//             InputLabelProps={{ shrink: true }}
//             label={dictionary.imageUrl}
//             value={feedback?.image}
//             onChange={e => setFeedback(prev => ({ ...prev, image: e.target.value }))}
//             fullWidth
//           />
//         )
//       default:
//         return <></>
//     }
//   }

//   return (
//     <Stack position='relative'>
//       <Stack direction='row' alignItems='center' justifyContent='space-between'>
//         <Stack direction='row' alignItems='center'>
//           <Typography variant='body2'>{dictionary.feedback}</Typography>
//           <IconButton onClick={() => setFeedback(null)} size='small'>
//             <RestartAlt />
//           </IconButton>
//         </Stack>
//         <Switch
//           checked={feedback?.isActive}
//           onChange={(e, c) => {
//             setFeedback(prev => ({
//               ...prev,
//               isActive: c
//             }))
//           }}
//         />
//       </Stack>
//       <Card>
//         <CardContent>
//           <Stack gap={2}>
//             {fields.map(f => (
//               <TextField
//                 key={f.key}
//                 variant='standard'
//                 size='small'
//                 label={f.label}
//                 InputLabelProps={{ shrink: true }}
//                 value={feedback?.[f.key] || ''}
//                 onChange={e =>
//                   setFeedback(prev => ({
//                     ...prev,
//                     [f.key]: e.target.value
//                   }))
//                 }
//                 fullWidth
//               />
//             ))}
//             <Stack gap={1}>
//               <Typography variant='body2'>{dictionary.color}</Typography>
//               <ColorPicker
//                 setValue={(value: string) =>
//                   setFeedback(prev => ({
//                     ...prev,
//                     color: value
//                   }))
//                 }
//                 value={feedback?.color}
//               />
//             </Stack>
//             <Stack gap={1}>
//               <Typography variant='body2'>{dictionary.type}</Typography>
//               <RadioGroup
//                 row
//                 value={feedback?.type}
//                 onChange={e =>
//                   setFeedback(prev => ({
//                     ...prev,
//                     type: e.target.value as 'button' | 'popup'
//                   }))
//                 }
//               >
//                 <FormControlLabel value='button' control={<Radio />} label='Button' />
//                 <FormControlLabel value='popup' control={<Radio />} label='Popup' />
//               </RadioGroup>
//             </Stack>
//             {feedback?.type === 'button' && (
//               <>
//                 <Stack gap={1}>
//                   <Typography variant='body2'>{dictionary.mainButtonText}</Typography>
//                   <TextField
//                     variant='standard'
//                     size='small'
//                     InputLabelProps={{ shrink: true }}
//                     value={feedback?.mainButtonText}
//                     onChange={e => setFeedback(prev => ({ ...prev, mainButtonText: e.target.value }))}
//                     fullWidth
//                   />
//                 </Stack>
//                 <Stack gap={2}>
//                   <Typography variant='body2'>{dictionary.imageType}</Typography>
//                   <ButtonGroupSelector
//                     options={[
//                       { label: 'None', value: 'none' },
//                       { label: 'Icon', value: 'icon' },
//                       { label: 'Image', value: 'image' },
//                       { label: 'URL', value: 'url' }
//                     ]}
//                     selectedValue={feedback.imageType || 'none'}
//                     onValueChange={newValue => {
//                       setFeedback(prev => ({
//                         ...prev,
//                         imageType: newValue,
//                         image: undefined
//                       }))
//                     }}
//                   />
//                   {renderImagePicker(feedback.imageType || 'none')}
//                 </Stack>
//               </>
//             )}
//             <Stack gap={1}>
//               <Stack direction='row' alignItems='center'>
//                 <Typography variant='body2'>{dictionary.questions}</Typography>
//                 <IconButton
//                   onClick={() =>
//                     setFeedback(prev => ({
//                       ...prev,
//                       questions: [...(prev?.questions || []), { text: '', type: '1' }]
//                     }))
//                   }
//                   size='small'
//                 >
//                   <Add />
//                 </IconButton>
//               </Stack>
//               {(feedback?.questions || []).map((question, i) => (
//                 <Stack key={i} direction='row' alignItems='center' gap={2}>
//                   <TextField
//                     variant='standard'
//                     size='small'
//                     label={`${dictionary.question} ${i + 1}`}
//                     InputLabelProps={{ shrink: true }}
//                     value={question.text}
//                     onChange={e =>
//                       setFeedback(prev => {
//                         const updatedQuestions = [...(prev?.questions || [])]

//                         updatedQuestions[i] = { ...updatedQuestions[i], text: e.target.value }

//                         return {
//                           ...prev,
//                           questions: updatedQuestions
//                         }
//                       })
//                     }
//                     fullWidth
//                   />
//                   <Stack>
//                     <Typography variant='body2'>{dictionary.type}</Typography>
//                     <ButtonGroupSelector
//                       options={[
//                         { label: 'T', value: '1' },
//                         { label: 'R', value: '2' },
//                         { label: 'Y/N', value: '3' }
//                       ]}
//                       selectedValue={question.type}
//                       onValueChange={newType => {
//                         setFeedback(prev => {
//                           const updatedQuestions = [...(prev?.questions || [])]

//                           updatedQuestions[i] = { ...updatedQuestions[i], type: newType }

//                           return {
//                             ...prev,
//                             questions: updatedQuestions
//                           }
//                         })
//                       }}
//                     />
//                   </Stack>
//                   <IconButton
//                     onClick={() =>
//                       setFeedback(prev => {
//                         const updatedQuestions = [...(prev?.questions || [])]

//                         updatedQuestions.splice(i, 1)

//                         return {
//                           ...prev,
//                           questions: updatedQuestions
//                         }
//                       })
//                     }
//                     size='small'
//                   >
//                     <Delete />
//                   </IconButton>
//                 </Stack>
//               ))}
//             </Stack>
//           </Stack>
//         </CardContent>
//       </Card>
//       {!!lockState && (
//         <Box
//           onClick={() => toast.info(getLockMessage(dictionary, lockState))}
//           sx={{ position: 'absolute', zIndex: 10, top: 0, right: 0, bottom: 0, left: 0 }}
//         />
//       )}
//     </Stack>
//   )
// }

// export default FeedbackSettings
