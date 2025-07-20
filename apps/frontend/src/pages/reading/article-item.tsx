// @mui
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import CardContent from '@mui/material/CardContent';
// utils
import { fDate } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export default function ArticleItem({ article, onClick }: { article: any, onClick: (article: any) => void }) {

  return (
    <Card onClick={() => onClick(article)}>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          {article.title}
        </Typography>
        <Typography variant="caption" color="text.secondary" gutterBottom>
          {fDate(article.createdAt)}
        </Typography>
        <Typography 
          variant="body1" 
          sx={{ 
            whiteSpace: 'pre-line',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            lineHeight: 1.5,
            maxHeight: '4.5em' // 3行 * 1.5行高
          }}
        >
          {article.content}
        </Typography>
      </CardContent>
    </Card>
  );
}

// 如需后续支持逐字高亮，可在此处扩展 wordTimestamps 的渲染逻辑。