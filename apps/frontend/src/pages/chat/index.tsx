import { Helmet } from 'react-helmet-async';

import { CONFIG } from 'src/config-global';

import { ChatView } from './views/chat-view';

// ----------------------------------------------------------------------

const metadata = { title: `聊天 ${CONFIG.site.name}` };

export default function Chat() {
  return (
    <>
      <Helmet>
        <title>{metadata.title}</title>
      </Helmet>
      
      <ChatView />
    </>
  )
}
