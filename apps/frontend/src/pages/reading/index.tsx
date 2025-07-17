import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import ReadingView from './views/reading-view';

// ----------------------------------------------------------------------

const metadata = { title: `聊天 ${CONFIG.site.name}` };

export default function Reading() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      
      <ReadingView />
    </>
  )
}
