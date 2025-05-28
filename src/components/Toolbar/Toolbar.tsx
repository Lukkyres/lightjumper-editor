import { 
  PaintBrush, 
  Eraser, 
  PaintBucket, 
  FrameCorners, 
  Selection, 
  ArrowsOutCardinal,
  LineSegment,
  Square,
  Circle,
  NumberFive,
  ArrowClockwise,
  ArrowCounterClockwise
} from '@phosphor-icons/react';
import useEditorStore from '../../store/editorStore';
import './Toolbar.css';

type ToolButtonProps = {
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  tooltip: string;
};

const ToolButton = ({ icon, isActive, onClick, tooltip }: ToolButtonProps) => (
  <button 
    className={`toolbar-button ${isActive ? 'active' : ''}`}
    onClick={() => {

      onClick();
    }}
    title={tooltip}
  >
    {icon}
  </button>
);

const Toolbar = () => {
  const { currentTool, setCurrentTool } = useEditorStore();
  
  const tools = [
    { 
      id: 'BRUSH' as const, 
      icon: <PaintBrush size={24} weight="fill" />,
      tooltip: 'Brush Tool (B)'
    },
    { 
      id: 'ERASER' as const, 
      icon: <Eraser size={24} weight="fill" />,
      tooltip: 'Eraser Tool (E)'
    },
    { 
      id: 'BUCKET' as const, 
      icon: <PaintBucket size={24} weight="fill" />,
      tooltip: 'Paint Bucket Tool (G)'
    },
    { 
      id: 'NUMBER' as const, 
      icon: <NumberFive size={24} weight="fill" />,
      tooltip: 'Number Tool (N)'
    },
    { 
      id: 'SELECT' as const, 
      icon: <Selection size={24} weight="fill" />,
      tooltip: 'Selection Tool (S)'
    },
    { 
      id: 'MOVE' as const, 
      icon: <ArrowsOutCardinal size={24} weight="fill" />,
      tooltip: 'Move Tool (M)'
    },
    { 
      id: 'VIEWPORT' as const, 
      icon: <FrameCorners size={24} weight="fill" />,
      tooltip: 'Viewport Tool (V)'
    },
    { 
      id: 'LINE' as const, 
      icon: <LineSegment size={24} weight="fill" />,
      tooltip: 'Line Tool (L)'
    },
    { 
      id: 'RECTANGLE' as const, 
      icon: <Square size={24} weight="fill" />,
      tooltip: 'Rectangle Tool (R)'
    },
    { 
      id: 'ELLIPSE' as const, 
      icon: <Circle size={24} weight="fill" />,
      tooltip: 'Ellipse Tool (O)'
    }
  ];

  return (
    <div className="toolbar">
      <div className="toolbar-tools">
        <ToolButton
          icon={<PaintBrush size={24} weight="fill" />}
          isActive={currentTool === 'BRUSH'}
          onClick={() => setCurrentTool('BRUSH')}
          tooltip="Brush Tool (B)"
        />
        <ToolButton
          icon={<Eraser size={24} weight="fill" />}
          isActive={currentTool === 'ERASER'}
          onClick={() => setCurrentTool('ERASER')}
          tooltip="Eraser Tool (E)"
        />
        <ToolButton
          icon={<PaintBucket size={24} weight="fill" />}
          isActive={currentTool === 'BUCKET'}
          onClick={() => setCurrentTool('BUCKET')}
          tooltip="Fill Tool (F)"
        />
        <ToolButton
          icon={<Selection size={24} weight="fill" />}
          isActive={currentTool === 'SELECT'}
          onClick={() => setCurrentTool('SELECT')}
          tooltip="Selection Tool (S)"
        />
        <ToolButton
          icon={<FrameCorners size={24} weight="fill" />}
          isActive={currentTool === 'VIEWPORT'}
          onClick={() => setCurrentTool('VIEWPORT')}
          tooltip="Viewport Tool (V)"
        />
        <ToolButton
          icon={<ArrowsOutCardinal size={24} weight="fill" />}
          isActive={currentTool === 'MOVE'}
          onClick={() => setCurrentTool('MOVE')}
          tooltip="Move Tool (M)"
        />
        <ToolButton
          icon={<LineSegment size={24} weight="fill" />}
          isActive={currentTool === 'LINE'}
          onClick={() => setCurrentTool('LINE')}
          tooltip="Line Tool (L)"
        />
        <ToolButton
          icon={<Square size={24} weight="fill" />}
          isActive={currentTool === 'RECTANGLE'}
          onClick={() => setCurrentTool('RECTANGLE')}
          tooltip="Rectangle Tool (R)"
        />
        <ToolButton
          icon={<Circle size={24} weight="fill" />}
          isActive={currentTool === 'ELLIPSE'}
          onClick={() => setCurrentTool('ELLIPSE')}
          tooltip="Ellipse Tool (O)"
        />
        <ToolButton
          icon={<NumberFive size={24} weight="fill" />}
          isActive={currentTool === 'NUMBER'}
          onClick={() => setCurrentTool('NUMBER')}
          tooltip="Number Tool (N)"
        />
      </div>
      
      {/* Color Picker Button entfernt */}
    </div>
  );
};

export default Toolbar;
