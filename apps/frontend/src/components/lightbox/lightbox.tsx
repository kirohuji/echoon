import ReactLightbox, { useLightboxState } from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Video from 'yet-another-react-lightbox/plugins/video';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Slideshow from 'yet-another-react-lightbox/plugins/slideshow';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
// @mui
import Box from '@mui/material/Box';
//
import { Iconify } from 'src/components/iconify';
//
import StyledLightbox from './styles';

// ----------------------------------------------------------------------

const ICON_SIZE = 24;

export default function Lightbox({
  slides,
  disabledZoom,
  disabledVideo,
  disabledTotal,
  disabledCaptions,
  disabledSlideshow,
  disabledThumbnails,
  disabledFullscreen,
  open,
  close,
  onGetCurrentIndex,
  ...other
}: {
  slides: any[];
  disabledZoom: boolean;
  disabledVideo: boolean;
  disabledTotal: boolean;
  disabledCaptions: boolean;
  disabledSlideshow: boolean;
  disabledThumbnails: boolean;
  disabledFullscreen: boolean;
  open: boolean;
  close: () => void;
  onGetCurrentIndex: (index: number) => void;
}) {
  const totalItems = slides ? slides.length : 0;

  return (
    <>
      <StyledLightbox />

      <ReactLightbox
        open={open}
        close={close}
        slides={slides}
        animation={{ swipe: 240 }}
        carousel={{ finite: totalItems < 5 }}
        controller={{ closeOnBackdropClick: true }}
        plugins={getPlugins({
          disabledZoom,
          disabledVideo,
          disabledCaptions,
          disabledSlideshow,
          disabledThumbnails,
          disabledFullscreen,
        })}
        on={{
          view: ({ index }) => {
            if (onGetCurrentIndex) {
              onGetCurrentIndex(index);
            }
          },
        }}
        toolbar={{
          buttons: [
            <DisplayTotal key={0} totalItems={totalItems} disabledTotal={disabledTotal} />,
            'close',
          ],
        }}
        render={{
          iconClose: () => <Iconify width={ICON_SIZE} icon="carbon:close" />,
          iconZoomIn: () => <Iconify width={ICON_SIZE} icon="carbon:zoom-in" />,
          iconZoomOut: () => <Iconify width={ICON_SIZE} icon="carbon:zoom-out" />,
          iconSlideshowPlay: () => <Iconify width={ICON_SIZE} icon="carbon:play" />,
          iconSlideshowPause: () => <Iconify width={ICON_SIZE} icon="carbon:pause" />,
          iconPrev: () => <Iconify width={ICON_SIZE + 8} icon="carbon:chevron-left" />,
          iconNext: () => <Iconify width={ICON_SIZE + 8} icon="carbon:chevron-right" />,
          iconExitFullscreen: () => <Iconify width={ICON_SIZE} icon="carbon:center-to-fit" />,
          iconEnterFullscreen: () => <Iconify width={ICON_SIZE} icon="carbon:fit-to-screen" />,
        }}
        {...other}
      />
    </>
  );
}

// ----------------------------------------------------------------------

export function getPlugins({
  disabledZoom,
  disabledVideo,
  disabledCaptions,
  disabledSlideshow,
  disabledThumbnails,
  disabledFullscreen,
}: {
  disabledZoom: boolean;
  disabledVideo: boolean;
  disabledCaptions: boolean;
  disabledSlideshow: boolean;
  disabledThumbnails: boolean;
  disabledFullscreen: boolean;
}) {
  let plugins = [Captions, Fullscreen, Slideshow, Thumbnails, Video, Zoom];

  if (disabledThumbnails) {
    plugins = plugins.filter((plugin) => plugin !== Thumbnails);
  }
  if (disabledCaptions) {
    plugins = plugins.filter((plugin) => plugin !== Captions);
  }
  if (disabledFullscreen) {
    plugins = plugins.filter((plugin) => plugin !== Fullscreen);
  }
  if (disabledSlideshow) {
    plugins = plugins.filter((plugin) => plugin !== Slideshow);
  }
  if (disabledZoom) {
    plugins = plugins.filter((plugin) => plugin !== Zoom);
  }
  if (disabledVideo) {
    plugins = plugins.filter((plugin) => plugin !== Video);
  }

  return plugins;
}

// ----------------------------------------------------------------------

export function DisplayTotal({ totalItems, disabledTotal }: { totalItems: number, disabledTotal: boolean }) {
  const { currentIndex } = useLightboxState();

  if (disabledTotal) {
    return null;
  }

  return (
    <Box
      component="span"
      className="yarl__button"
      sx={{
        typography: 'body2',
        alignItems: 'center',
        display: 'inline-flex',
        justifyContent: 'center',
      }}
    >
      <strong> {currentIndex + 1} </strong> / {totalItems}
    </Box>
  );
}

