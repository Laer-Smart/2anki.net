import { useParams } from 'react-router-dom';
import { MindmapList } from './MindmapList';
import { MindmapEditor } from './MindmapEditor';

export default function MindmapsPage() {
  const { id } = useParams<{ id?: string }>();

  if (id != null) {
    return <MindmapEditor />;
  }

  return <MindmapList />;
}
