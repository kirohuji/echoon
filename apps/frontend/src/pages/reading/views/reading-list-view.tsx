import { useCallback, useEffect, useState } from 'react';
import { Fab, Grid, IconButton, MenuItem, Alert, Button, Box, Typography } from '@mui/material';
import { MainContent } from 'src/layouts/main';
import AddIcon from '@mui/icons-material/Add';
import { documentService } from 'src/composables/context-provider';
import { useRouter } from 'src/routes/hooks';
import { Iconify } from 'src/components/iconify';
import CustomPopover, { usePopover } from 'src/components/custom-popover';
import { ArticleItemSkeleton } from '../article-skeleton';
import ArticleItem from '../article-item';

export default function ReadingListView() {
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<any>(null);

  const [documents, setDocuments] = useState([]);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const router = useRouter();
  const popover = usePopover();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentService.pagination({ page: 1, limit: 10, mine: true });
      setDocuments(res.data.data);
      setPagination({
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
      });
    } catch (error) {
      console.error('获取文档列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 删除文档
  const handleDelete = useCallback(async () => {
    if (!documentToDelete) return;
    
    setDeleting(true);
    try {
      await documentService.delete({ id: documentToDelete.id });
      // 删除成功后刷新列表
      refresh();
    } catch (error) {
      console.error('删除文档失败:', error);
    } finally {
      setDeleting(false);
      setShowDeleteAlert(false);
      setDocumentToDelete(null);
      popover.onClose();
    }
  }, [documentToDelete, refresh, popover]);

  // 显示删除确认
  const handleShowDeleteConfirm = (document: any) => {
    setDocumentToDelete(document);
    setShowDeleteAlert(true);
    popover.onClose();
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  const renderSkeleton = (
    <>
      {[...Array(16)].map((_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <ArticleItemSkeleton />
        </Grid>
      ))}
    </>
  );
  
  const renderList = (
    <>
      {documents.map((document: any, index: number) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <ArticleItem article={document} onClick={() => {
              router.push(`/reading/${document?.id}`);
            }} />
            
            {/* 删除按钮 */}
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                popover.onOpen(event);
                setDocumentToDelete(document);
              }}
              sx={{
                position: 'absolute',
                bottom: -8,
                left: 8,
                bgcolor: 'background.paper',
                boxShadow: (theme) => theme.customShadows.z8,
                '&:hover': {
                  bgcolor: 'error.lighter',
                  color: 'error.main',
                },
              }}
            >
              <Iconify icon="eva:more-vertical-fill" />
            </IconButton>
          </Box>
        </Grid>
      ))}
    </>
  );
  
  return (
    <>
      <MainContent sx={{ p: 0, overflow: 'hidden' }}>
        <Grid container spacing={3} sx={{ position: 'relative', height: '100vh', overflow: 'auto', p: 2, pb: '80px' }}>
          {loading ? renderSkeleton : renderList}
        </Grid>
        <Fab color="primary" aria-label="add" sx={{ position: 'absolute', bottom: 80, right: 20 }} onClick={() => {
          router.push('/reading/create');
        }}>
          <AddIcon />
        </Fab>
      </MainContent>

      {/* 删除菜单 */}
      <CustomPopover 
        open={popover.open} 
        onClose={popover.onClose} 
        arrow="left-top" 
        sx={{ p: 0 }} 
        hiddenArrow={false}
      >
        <MenuItem onClick={() => handleShowDeleteConfirm(documentToDelete)} sx={{ color: 'error.main' }}>
          <Iconify icon="solar:trash-bin-trash-bold" width={24} />
          删除
        </MenuItem>
      </CustomPopover>

      {/* 删除确认弹窗 */}
      {showDeleteAlert && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Alert
            severity="warning"
            sx={{
              maxWidth: 400,
              p: 3,
              '& .MuiAlert-message': {
                width: '100%',
              },
            }}
          >
            <Typography variant="h6" gutterBottom>
              确认删除
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              确定要删除文章 `{documentToDelete?.title}`吗？此操作无法撤销。
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button
                size="small"
                onClick={() => {
                  setShowDeleteAlert(false);
                  setDocumentToDelete(null);
                }}
                disabled={deleting}
              >
                取消
              </Button>
              <Button
                size="small"
                color="error"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '删除中...' : '删除'}
              </Button>
            </Box>
          </Alert>
        </Box>
      )}
    </>
  );
}