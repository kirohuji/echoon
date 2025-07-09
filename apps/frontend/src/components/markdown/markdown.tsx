/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-unresolved */
// utils
import 'src/utils/highlight';
import ReactMarkdown from 'react-markdown';
// markdown plugins
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
// @mui
import Link from '@mui/material/Link';
// routes
import { RouterLink } from 'src/routes/components';
//
import Image from '../image';
//
import StyledMarkdown from './styles';

// ----------------------------------------------------------------------

export default function Markdown({ sx, children, ...other }: { sx: any, children: any }) {
  return (
    <StyledMarkdown sx={sx}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[
          rehypeKatex,
          rehypeRaw,
          rehypeHighlight,
          [remarkGfm, { singleTilde: false }],
        ]}
        components={components}
        children={children}
        {...other}
      />
    </StyledMarkdown>
  );
}


// ----------------------------------------------------------------------

const components = {
  img: ({ ...props }: any) => <Image alt={props.alt} ratio="16/9" sx={{ borderRadius: 2 }} {...props} />,
  a: ({ ...props }: any) => {
    const isHttp = props.href.includes('http');

    return isHttp ? (
      <Link target="_blank" rel="noopener" {...props} />
    ) : (
      <Link component={RouterLink} href={props.href} {...props}>
        {props.children}
      </Link>
    );
  },
};
