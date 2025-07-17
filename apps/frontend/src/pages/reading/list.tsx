import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import ReadingListView from './views/reading-list-view';

// ----------------------------------------------------------------------

const metadata = { title: `聊天 ${CONFIG.site.name}` };

export default function ReadingList() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      
      <ReadingListView />
    </>
  )
}
