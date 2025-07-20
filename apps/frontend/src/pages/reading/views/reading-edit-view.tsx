import { useState, useCallback, useEffect, } from "react";
import { MainContent } from "src/layouts/main";
import { useParams } from "src/routes/hooks";
import { documentService } from "src/composables/context-provider";
import ArticleNewEditForm, { type NewSchemaType } from "../article-new-edit-form";

export default function ReadingEditView() {
  const { id } = useParams();

  const [currentData, setCurrentData] = useState<NewSchemaType | null>(null);

  const getCurrentData = useCallback(async () => {
    try {
      const res = await documentService.get(id);
      setCurrentData(res.data);
    } catch (error) {
      console.error(error);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      getCurrentData();
    }
  }, [id, getCurrentData]);

  return (
    <MainContent sx={{ pt: '80px', overflow: 'hidden' }}>
      <ArticleNewEditForm currentData={currentData} />
    </MainContent>
  )
}