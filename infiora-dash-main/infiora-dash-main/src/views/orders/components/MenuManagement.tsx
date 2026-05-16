'use client'
import { useState } from 'react'

import {
  Stack,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  IconButton,
  Chip,
  Switch,
  Tooltip,
  Tabs,
  Tab,
  TextField,
  InputAdornment
} from '@mui/material'

import { toast } from 'react-toastify'

import {
  useGetCategoriesQuery,
  useDeleteCategoryMutation,
  useUpdateCategoryMutation,
  useGetCatalogItemsQuery,
  useDeleteCatalogItemMutation,
  useToggleCatalogItemMutation
} from '@/redux/api/ordersApi'
import CategoryDialog from './CategoryDialog'
import ItemDialog from './ItemDialog'
import Loader from '@/components/common/Loader'
import { useDictionary } from '@/contexts/DictionaryContext'

import type { IOrderCategory, ICatalogItem } from '@/types'

export default function MenuManagement({ hotelId, currency = '€' }: { hotelId: string; currency?: string }) {
  const dictionary: any = useDictionary()
  const t = dictionary.pages?.ordersMenu || {}
  const [tab, setTab] = useState(0)
  const [search, setSearch] = useState('')
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null)
  const [catDialogOpen, setCatDialogOpen] = useState(false)
  const [editCategory, setEditCategory] = useState<IOrderCategory | null>(null)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ICatalogItem | null>(null)

  const { data: categories = [], isLoading: loadingCats } = useGetCategoriesQuery(hotelId)

  const { data: items = [], isLoading: loadingItems } = useGetCatalogItemsQuery({
    hotelId,
    categoryId: selectedCatId || undefined
  })

  const [deleteCategory] = useDeleteCategoryMutation()
  const [updateCategory] = useUpdateCategoryMutation()
  const [deleteItem] = useDeleteCatalogItemMutation()
  const [toggleItem] = useToggleCatalogItemMutation()

  const categoriesList: IOrderCategory[] = Array.isArray(categories) ? categories : (categories as any)?.results || []
  const itemsList: ICatalogItem[] = Array.isArray(items) ? items : (items as any)?.results || []

  const filteredItems = itemsList.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))

  const handleDeleteCategory = async (cat: IOrderCategory) => {
    if (!confirm(`Delete category "${cat.name}"? Items in this category may be affected.`)) return

    try {
      await deleteCategory({ hotelId, categoryId: cat.id }).unwrap()
      toast.success(t.categoryDeleted || 'Category deleted')
    } catch {
      toast.error(t.deleteCategoryFailed || 'Failed to delete category')
    }
  }

  const handleDeleteItem = async (item: ICatalogItem) => {
    if (!confirm(`Delete "${item.name}"?`)) return

    try {
      await deleteItem({ hotelId, itemId: item.id }).unwrap()
      toast.success(t.itemDeleted || 'Item deleted')
    } catch {
      toast.error(t.deleteItemFailed || 'Failed to delete item')
    }
  }

  const handleToggleItem = async (item: ICatalogItem) => {
    try {
      await toggleItem({ hotelId, itemId: item.id }).unwrap()
    } catch {
      toast.error(t.toggleItemFailed || 'Failed to toggle item')
    }
  }

  const handleToggleCategory = async (cat: IOrderCategory) => {
    try {
      await updateCategory({ hotelId, categoryId: cat.id, active: !cat.active }).unwrap()
    } catch {
      toast.error(t.updateCategoryFailed || 'Failed to update category')
    }
  }

  return (
    <Stack gap={2}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label={`${t.categories || 'Categories'} (${categoriesList.length})`} />
        <Tab label={`${dictionary.items} (${(items as ICatalogItem[]).length})`} />
      </Tabs>

      {/* CATEGORIES TAB */}
      {tab === 0 && (
        <Stack gap={2}>
          <Stack direction='row' justifyContent='flex-end'>
            <Button
              variant='contained'
              startIcon={<i className='ri-add-line' />}
              onClick={() => {
                setEditCategory(null)
                setCatDialogOpen(true)
              }}
            >
              {t.addCategory || 'Add Category'}
            </Button>
          </Stack>

          {loadingCats ? (
            <Loader />
          ) : (
            <Stack gap={1}>
              {categoriesList.length === 0 ? (
                <Box textAlign='center' py={6}>
                  <Typography fontSize={36} mb={1}>
                    🗂️
                  </Typography>
                  <Typography color='text.secondary'>
                    {t.noCategoriesYet || 'No categories yet. Add your first one!'}
                  </Typography>
                </Box>
              ) : (
                (() => {
                  const topLevel = categoriesList.filter(c => !c.parentId)
                  const subCategories = categoriesList.filter(c => c.parentId)

                  const renderCategoryRow = (cat: IOrderCategory, isSubcategory?: boolean) => (
                    <Card key={cat.id} variant='outlined' sx={isSubcategory ? { ml: 4, borderStyle: 'dashed' } : {}}>
                      <CardContent sx={{ py: '12px !important' }}>
                        <Stack direction='row' alignItems='center' gap={2}>
                          {isSubcategory && (
                            <Typography variant='caption' color='text.secondary' sx={{ flexShrink: 0 }}>
                              ↳
                            </Typography>
                          )}
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 1,
                              bgcolor: 'grey.100',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 24,
                              overflow: 'hidden',
                              flexShrink: 0
                            }}
                          >
                            {cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('data:')) ? (
                              <img
                                src={cat.icon}
                                alt=''
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              cat.icon
                            )}
                          </Box>
                          <Box flex={1}>
                            <Typography variant='subtitle2' fontWeight={600}>
                              {cat.name}
                            </Typography>
                            <Typography variant='caption' color='text.secondary'>
                              {itemsList.filter(i => i.categoryId === cat.id).length} {dictionary.items.toLowerCase()}
                              {isSubcategory && (
                                <Chip
                                  label={t.subcategory || 'subcategory'}
                                  size='small'
                                  variant='outlined'
                                  sx={{ ml: 1, height: 16, fontSize: 10 }}
                                />
                              )}
                            </Typography>
                          </Box>
                          <Switch checked={cat.active} onChange={() => handleToggleCategory(cat)} size='small' />
                          <Tooltip title={t.filterItemsByCategory || 'Filter items by this category'}>
                            <Button
                              size='small'
                              variant={selectedCatId === cat.id ? 'contained' : 'outlined'}
                              onClick={() => {
                                setSelectedCatId(selectedCatId === cat.id ? null : cat.id)
                                setTab(1)
                              }}
                            >
                              {dictionary.items}
                            </Button>
                          </Tooltip>
                          <IconButton
                            size='small'
                            onClick={() => {
                              setEditCategory(cat)
                              setCatDialogOpen(true)
                            }}
                          >
                            <i className='ri-edit-line' />
                          </IconButton>
                          <IconButton size='small' color='error' onClick={() => handleDeleteCategory(cat)}>
                            <i className='ri-delete-bin-line' />
                          </IconButton>
                        </Stack>
                      </CardContent>
                    </Card>
                  )

                  return topLevel.map(cat => (
                    <Stack key={cat.id} gap={0.5}>
                      {renderCategoryRow(cat)}
                      {subCategories.filter(s => s.parentId === cat.id).map(sub => renderCategoryRow(sub, true))}
                    </Stack>
                  ))
                })()
              )}
            </Stack>
          )}
        </Stack>
      )}

      {/* ITEMS TAB */}
      {tab === 1 && (
        <Stack gap={2}>
          <Stack direction='row' gap={1} alignItems='center' justifyContent='space-between' flexWrap='wrap'>
            <Stack direction='row' gap={1} flexWrap='wrap'>
              <Chip
                label={dictionary.allRatings || 'All'}
                onClick={() => setSelectedCatId(null)}
                color={selectedCatId === null ? 'primary' : 'default'}
                variant={selectedCatId === null ? 'filled' : 'outlined'}
                size='small'
              />
              {categoriesList.map(cat => {
                const isUrl = cat.icon && (cat.icon.startsWith('http') || cat.icon.startsWith('data:'))

                return (
                  <Chip
                    key={cat.id}
                    label={isUrl ? cat.name : `${cat.icon} ${cat.name}`}
                    onClick={() => setSelectedCatId(cat.id)}
                    color={selectedCatId === cat.id ? 'primary' : 'default'}
                    variant={selectedCatId === cat.id ? 'filled' : 'outlined'}
                    size='small'
                    avatar={
                      isUrl ? (
                        <Box
                          component='img'
                          src={cat.icon}
                          sx={{ width: 20, height: 20, borderRadius: '50%', objectFit: 'cover' }}
                        />
                      ) : undefined
                    }
                  />
                )
              })}
            </Stack>
            <Stack direction='row' gap={1}>
              <TextField
                size='small'
                placeholder={t.searchItems || 'Search items...'}
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position='start'>
                      <i className='ri-search-line' />
                    </InputAdornment>
                  )
                }}
              />
              <Button
                variant='contained'
                startIcon={<i className='ri-add-line' />}
                onClick={() => {
                  setEditItem(null)
                  setItemDialogOpen(true)
                }}
              >
                {t.addItem || 'Add Item'}
              </Button>
            </Stack>
          </Stack>

          {loadingItems ? (
            <Loader />
          ) : (
            <Card variant='outlined'>
              {/* Table header */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 120px 90px 80px 80px 100px',
                  px: 2,
                  py: 1.5,
                  bgcolor: 'grey.50',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                {[
                  '',
                  dictionary.name,
                  t.category || 'Category',
                  dictionary.price,
                  t.discount || 'Discount',
                  t.available || 'Available',
                  t.actions || 'Actions'
                ].map(h => (
                  <Typography
                    key={h}
                    variant='caption'
                    color='text.secondary'
                    fontWeight={600}
                    textTransform='uppercase'
                    letterSpacing={0.5}
                  >
                    {h}
                  </Typography>
                ))}
              </Box>

              {filteredItems.length === 0 ? (
                <Box textAlign='center' py={6}>
                  <Typography fontSize={36} mb={1}>
                    🍽️
                  </Typography>
                  <Typography color='text.secondary'>
                    {t.noItemsFound || 'No items found. Add your first service or product!'}
                  </Typography>
                </Box>
              ) : (
                filteredItems.map((item, idx) => {
                  const cat = categoriesList.find(c => c.id === item.categoryId)
                  const discountedPrice = item.discount ? item.price * (1 - item.discount / 100) : item.price

                  return (
                    <Box
                      key={item.id}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '60px 1fr 120px 90px 80px 80px 100px',
                        px: 2,
                        py: 1.5,
                        alignItems: 'center',
                        borderBottom: idx < filteredItems.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                        '&:hover': { bgcolor: 'grey.50' }
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: 1,
                          bgcolor: 'grey.100',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 24,
                          overflow: 'hidden'
                        }}
                      >
                        {item.image && (item.image.startsWith('http') || item.image.startsWith('data:')) ? (
                          <img src={item.image} alt='' style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          item.image
                        )}
                      </Box>
                      <Box>
                        <Stack direction='row' alignItems='center' gap={0.5}>
                          <Typography variant='body2' fontWeight={600}>
                            {item.name}
                          </Typography>
                          {item.badge && <Chip label={item.badge} size='small' color='error' variant='tonal' />}
                        </Stack>
                        {item.description && (
                          <Typography variant='caption' color='text.secondary' noWrap sx={{ maxWidth: 200 }}>
                            {item.description}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography variant='body2' color='text.secondary'>
                          {cat ? `${cat.icon} ${cat.name}` : '-'}
                        </Typography>
                        {cat?.parentId && (
                          <Typography variant='caption' color='text.disabled'>
                            {categoriesList.find(c => c.id === cat.parentId)?.name || ''}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <Typography variant='body2' fontWeight={700}>
                          {discountedPrice.toFixed(2)} {currency}
                        </Typography>
                        {item.discount ? (
                          <Typography variant='caption' color='text.secondary' sx={{ textDecoration: 'line-through' }}>
                            {item.price.toFixed(2)}
                          </Typography>
                        ) : null}
                      </Box>
                      <Typography variant='body2' color={item.discount ? 'error.main' : 'text.secondary'}>
                        {item.discount ? `-${item.discount}%` : '-'}
                      </Typography>
                      <Switch checked={item.available} onChange={() => handleToggleItem(item)} size='small' />
                      <Stack direction='row' gap={0.5}>
                        <IconButton
                          size='small'
                          onClick={() => {
                            setEditItem(item)
                            setItemDialogOpen(true)
                          }}
                        >
                          <i className='ri-edit-line' style={{ fontSize: 16 }} />
                        </IconButton>
                        <IconButton size='small' color='error' onClick={() => handleDeleteItem(item)}>
                          <i className='ri-delete-bin-line' style={{ fontSize: 16 }} />
                        </IconButton>
                      </Stack>
                    </Box>
                  )
                })
              )}
            </Card>
          )}
        </Stack>
      )}

      <CategoryDialog
        open={catDialogOpen}
        onClose={() => setCatDialogOpen(false)}
        hotelId={hotelId}
        category={editCategory}
        categories={categoriesList.filter(c => !c.parentId)}
      />
      <ItemDialog
        open={itemDialogOpen}
        onClose={() => setItemDialogOpen(false)}
        hotelId={hotelId}
        categories={categoriesList}
        item={editItem}
        defaultCategoryId={selectedCatId || undefined}
        currency={currency}
      />
    </Stack>
  )
}
