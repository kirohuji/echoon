import { useState } from 'react';
import { Grid } from '@mui/material';
import { MainContent } from 'src/layouts/main';
import { ArticleItemSkeleton } from '../article-skeleton';
import ArticleItem from '../article-item';


export default function ReadingListView() {
  const [loading, setLoading] = useState(true);

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
    <MainContent>
      <Grid container spacing={3}>
        {loading ? renderSkeleton : renderList}
      </Grid>

    </MainContent>
  );
}