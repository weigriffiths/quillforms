/**
 * External Dependencies
 */
import { ReactEditor, RenderElementProps } from 'slate-react';

/**
 * Internal Dependencies
 */
import MergeTagComponent from '../merge-tag';
import type { MergeTags, Link } from '../../types';

interface Props extends RenderElementProps {
	editor: ReactEditor;
	mergeTags: MergeTags;
}
const Element: React.FC< Props > = ( {
	attributes,
	children,
	element,
	editor,
	mergeTags,
} ) => {
	const path = ReactEditor.findPath( editor, element );

	if ( element.type === 'mergeTag' ) {
		return (
			<MergeTagComponent
				element={ element }
				mergeTags={ mergeTags }
				editor={ editor }
				path={ path }
				attributes={ attributes }
				children={ null }
			/>
		);
	} else if ( element.type === 'link' ) {
		return (
			<a { ...attributes } href={ ( element as Link ).url }>
				{ children }
			</a>
		);
	}
	return <p { ...attributes }>{ children }</p>;
};
export default Element;
