import { useAuthContext } from 'src/auth/hooks';
import { useRouter, useSearchParams } from 'src/routes/hooks';
import { MainContent } from 'src/layouts/main';

export function ChatView() {

  const router = useRouter();

  const { user } = useAuthContext();

  const searchParams = useSearchParams();

  const selectedConversationId = searchParams.get('id') || '';

  return (
    <MainContent>
      你好
    </MainContent>
  )
}