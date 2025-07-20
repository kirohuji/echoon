import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import ReadingEditView from './views/reading-edit-view';

// ----------------------------------------------------------------------

const metadata = { title: `聊天 ${CONFIG.site.name}` };

export default function ReadingEdit() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      
      <ReadingEditView />
    </>
  )
}
