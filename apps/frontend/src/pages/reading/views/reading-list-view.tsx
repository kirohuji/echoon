import { useCallback, useEffect, useState } from 'react';
import { Fab, Grid } from '@mui/material';
import { MainContent } from 'src/layouts/main';
import AddIcon from '@mui/icons-material/Add';
import { documentService } from 'src/composables/context-provider';
import { ArticleItemSkeleton } from '../article-skeleton';
import ArticleItem from '../article-item';

export default function ReadingListView() {
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });

  const refresh = useCallback(async () => {
    const res = await documentService.pagination({ page: 1, limit: 10 });
    setDocuments(res.data);
    setPagination(res.pagination);
  }, []);

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
      {[...Array(16)].map((_, index) => (
        <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
          <ArticleItem article={{}} index={index} />
        </Grid>
      ))}
    </>
  );
  return (
    <MainContent sx={{ p: 0, overflow: 'hidden' }}>
      <Grid container spacing={3} sx={{ position: 'relative', height: '100vh', overflow: 'auto', p: 2 }}>
        {loading ? renderSkeleton : renderList}
      </Grid>
      <Fab color="primary" aria-label="add" sx={{ position: 'absolute', bottom: 80, right: 20 }}>
        <AddIcon />
      </Fab>
    </MainContent>
  );
}