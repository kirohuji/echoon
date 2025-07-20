import { useEffect, useMemo } from 'react';
import { z as zod } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
// import Typography from '@mui/material/Typography';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'src/components/snackbar';
import { Form, Field } from 'src/components/hook-form';
import LoadingButton from '@mui/lab/LoadingButton';

const NewSchema = zod.object({
  title: zod.string().min(1, { message: '请输入标题' }),
  description: zod.string().min(1, { message: '请输入描述' }),
  content: zod.string().min(1, { message: '请输入内容' })
});


export type NewSchemaType = zod.infer<typeof NewSchema>;

export default function ArticleNewEditForm({ currentData }: { currentData: NewSchemaType | null }) {
  const { enqueueSnackbar } = useSnackbar();

  const defaultValues = useMemo(() => ({
    title: '',
    description: '',
    content: ''
  }), []);


  const methods = useForm<NewSchemaType>({
    mode: 'all',
    resolver: zodResolver(NewSchema),
    defaultValues,
  });

  const {
    reset,
    // watch,
    // setValue,
    handleSubmit,
    formState: { isSubmitting, isValid },
  } = methods;

  // const values = watch();

  useEffect(() => {
    if (currentData) {
      reset(defaultValues);
    }
  }, [currentData, defaultValues, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      reset();
      enqueueSnackbar(currentData ? 'Update success!' : 'Create success!');
      console.info('DATA', data);
    } catch (error) {
      console.error(error);
    }
  });

  const renderActions = (
    <Box display="flex" alignItems="center" flexWrap="wrap" justifyContent="flex-end">
      <div>
        <LoadingButton
          type="submit"
          variant="contained"
          size="large"
          loading={isSubmitting}
          sx={{ ml: 2 }}
        >
          {!currentData ? 'Create post' : 'Save changes'}
        </LoadingButton>
      </div>
    </Box>
  );

  const renderDetails = (
    <Card>
      <CardHeader title="Details" subheader="Title, short description, image..." sx={{ mb: 3 }} />

      <Divider />

      <Stack spacing={3} sx={{ p: 3 }}>
        <Field.Text name="title" label="Post title" />

        <Field.Text name="content" label="Description" multiline rows={3} />

        {/* <Stack spacing={1.5}>
          <Typography variant="subtitle2">Content</Typography>
          <Field.Editor name="content" sx={{ maxHeight: 480 }} />
        </Stack> */}

      </Stack>
    </Card>
  );

  return (
    <Form methods={methods} onSubmit={onSubmit}>
       <Stack spacing={2} sx={{ mx: 'auto', maxWidth: { xs: 720, xl: 880 } }}>
       {renderDetails}
       {renderActions}
      </Stack>
    </Form>
  )
}