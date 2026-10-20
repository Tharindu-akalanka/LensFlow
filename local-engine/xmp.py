"""Atomic sidecar export; originals and unrelated XMP fields stay untouched."""
import os
from pathlib import Path
import shutil
import tempfile
import xml.etree.ElementTree as ET

NAMESPACES = {'x':'adobe:ns:meta/', 'rdf':'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'xmp':'http://ns.adobe.com/xap/1.0/', 'snap':'https://snapsort.local/ns/1.0/'}
for prefix, uri in NAMESPACES.items():
    ET.register_namespace(prefix, uri)


def read_sidecar(source):
    """Preserve existing editorial ratings when a shoot is first imported."""
    destination = Path(source).with_suffix('.xmp')
    values = {'rating':0,'label':'','decision':'undecided','metadata_touched':False}
    if not destination.exists(): return values
    try:
        root = ET.parse(destination).getroot()
        for description in root.findall('.//rdf:Description',NAMESPACES):
            def field(prefix,name):
                tag='{'+NAMESPACES[prefix]+'}'+name
                child=description.find(tag)
                return description.get(tag) if tag in description.attrib else child.text if child is not None else None
            rating=field('xmp','Rating')
            label=field('xmp','Label')
            decision=field('snap','Decision')
            if rating is not None or label is not None: values['metadata_touched']=True
            if rating is not None and rating.lstrip('-').isdigit():
                values['rating']=max(0,min(5,int(rating)))
                if int(rating)==-1: values['decision']='reject'
            if label in ('Red','Yellow','Green','Blue','Purple'): values['label']=label
            if decision in ('keep','reject','undecided'): values['decision']=decision
    except (OSError,ET.ParseError):
        # Invalid sidecars are not repaired or overwritten during import.
        pass
    return values


def export_sidecars(photos, suggested=()):
    written, errors = 0, []
    counts = {}
    for photo in photos:
        key=str(Path(photo["source"]).with_suffix(".xmp")).casefold()
        counts[key]=counts.get(key,0)+1
    used = set()
    for photo in photos:
        source = Path(photo['source'])
        destination = source.with_suffix('.xmp')
        if counts[str(destination).casefold()] > 1:
            errors.append({'name':source.name,'error':'RAW/JPEG files share this sidecar name. Export them separately to avoid conflicting metadata.'})
            continue
        used.add(destination)
        try:
            if not source.is_file():
                raise ValueError('Original photo is missing')
            if destination.exists():
                tree = ET.parse(destination, parser=ET.XMLParser(target=ET.TreeBuilder(insert_comments=True)))
                root = tree.getroot()
                if root.tag != '{adobe:ns:meta/}xmpmeta' and root.tag != '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}RDF':
                    raise ValueError('Existing sidecar has an unsupported XML structure; left unchanged')
            else:
                root = ET.Element('{adobe:ns:meta/}xmpmeta')
                ET.SubElement(root, '{http://www.w3.org/1999/02/22-rdf-syntax-ns#}RDF')
                tree = ET.ElementTree(root)
            rdf = root if root.tag.endswith('}RDF') else root.find('rdf:RDF', NAMESPACES)
            if rdf is None:
                raise ValueError('Existing XMP has no RDF metadata; left unchanged')
            description = rdf.find('rdf:Description', NAMESPACES)
            if description is None:
                description = ET.SubElement(rdf, '{'+NAMESPACES['rdf']+'}Description', {'{'+NAMESPACES['rdf']+'}about':''})
            rating,label=photo.get('rating',0),photo.get('label','')
            if not photo.get('metadata_touched') and not rating and not label:
                if photo['decision']=='keep': rating,label=5,'Green'
                elif photo['decision']=='reject': rating,label=-1,'Red'
                elif photo['id'] in suggested: rating,label=4,'Yellow'
            fields = {'Rating':str(rating), 'Label':label}
            for key, value in fields.items():
                tag = '{'+NAMESPACES['xmp']+'}'+key
                child = description.find(tag)
                if child is not None:
                    child.text = value
                    description.attrib.pop(tag,None)
                else: description.set(tag,value)
            description.set('{'+NAMESPACES['snap']+'}Decision',photo['decision'])
            description.set('{'+NAMESPACES['snap']+'}Recommended',str(photo['id'] in suggested).lower())
            if destination.exists():
                backup = destination.with_suffix('.xmp.snapsort-backup')
                if not backup.exists(): shutil.copy2(destination, backup)
            fd, temp = tempfile.mkstemp(prefix='.snapsort-', suffix='.xmp', dir=destination.parent)
            try:
                with os.fdopen(fd,'wb') as handle:
                    tree.write(handle, encoding='utf-8', xml_declaration=True)
                    handle.flush(); os.fsync(handle.fileno())
                os.replace(temp,destination)
            finally:
                if Path(temp).exists(): Path(temp).unlink()
            written += 1
        except (OSError, ValueError, ET.ParseError) as error:
            errors.append({'name':source.name,'error':str(error)})
    return {'written':written,'failed':len(errors),'errors':errors}
