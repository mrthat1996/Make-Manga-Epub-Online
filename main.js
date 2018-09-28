const template = {
    'content.opf': `<?xml version="1.0" encoding="utf-8"?><package version="2.0" unique-identifier="BookId" xmlns="http://www.idpf.org/2007/opf"><metadata xmlns:opf="http://www.idpf.org/2007/opf" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:language>en</dc:language><dc:title>{{TITLE}}</dc:title><dc:creator opf:role="aut">{{AUTHOR}}</dc:creator><dc:date xmlns:opf="http://www.idpf.org/2007/opf" opf:event="modification">2018-09-20</dc:date><dc:identifier id="BookId" opf:scheme="UUID">urn:uuid:1ceedded-6f79-4f00-8093-13b28c7ba3f6</dc:identifier><meta name="cover" content="x01.jpg"/><meta property="rendition:layout">pre-paginated</meta><meta property="rendition:orientation">portrait</meta><meta property="rendition:spread">landscape</meta></metadata><manifest></manifest><spine page-progression-direction="rtl" toc="ncx"></spine><guide><reference type="cover" title="Cover" href="Text/cover.xhtml"/></guide></package>`,
    'toc.ncx': `<?xml version="1.0" encoding="utf-8" ?> <!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN"  "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd"><ncx version="2005-1" xmlns="http://www.daisy.org/z3986/2005/ncx/"><head><meta content="urn:uuid:1ceedded-6f79-4f00-8093-13b28c7ba3f6" name="dtb:uid"/><meta content="1" name="dtb:depth"/><meta content="0" name="dtb:totalPageCount"/><meta content="0" name="dtb:maxPageNumber"/></head><docTitle><text>{{TITLE}}</text></docTitle><navMap></navMap></ncx>`,
    'text.xhtml': `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"   "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xmlns:xml="http://www.w3.org/XML/1998/namespace" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="ja"><head><title>TITLE</title><meta name="viewport" content="width=826, height=1200, initial-scale=1, shrink-to-fit=no"/></head><body epub:type="bodymatter"><img src="../Images/02.jpg" alt="" width="100%" height="100%"/></body></html>`,
    'container.xml': `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`
}
let ImagesList = [];
let ImageObj = [];
let count = 0;
let XmlParser = new DOMParser();
let xml_serializer = new XMLSerializer();
let isRTL = true;

$(document).ready(function () {
    $('#sw-rtl').click(function () {
        if ($(this).is(':checked')) {
            isRTL = true;
            $('#listPage').css('direction', 'rtl');
        } else {
            isRTL = false;
            $('#listPage').css('direction', 'ltr');
        }
        renderListPage();
    });
});

function setTitle(name) {
    template['content.opf'] = template['content.opf'].replace("{{TITLE}}", name);
    template['toc.ncx'] = template['toc.ncx'].replace("{{TITLE}}", name);
}

function onSelectFile(ele) {
    count = 0;
    for (var i = 0, file; file = ele.files[i], i < ele.files.length; i++) {
        ImagesList.push(URL.createObjectURL(file));
    }
    renderListPage();
}

function clearAll() {
    for (var i = 0; i < ImagesList.length; i++) {
        URL.revokeObjectURL(ImagesList[i]);
    }
    ImagesList = [];
    $('#listPage').fadeOut(200, function () {
        $(this).html(`<li>
            <div class="no-image">
                <img src="no-image.jpg" alt="No image">
                <p>Add some image!</p>
            </div>
        </li>`).show();
    });
}

function deletePage(pageNum) {
    URL.revokeObjectURL(ImagesList[pageNum]);
    ImagesList.splice(pageNum, 1);
    renderListPage();
}

function PrepareUpload() {
    if (ImagesList.length) {
        ImageObj = [];
        count = 0;
        customAjax(count);
    } else {
        swal("Notice", "Please add some image!", "warning");
    }

}

function customAjax(i) {
    var request = new XMLHttpRequest();
    request.open('GET', ImagesList[i], true);
    request.responseType = 'blob';
    request.onload = function () {
        ImageObj.push(request.response);
        count++;
        if (count < ImagesList.length) {
            customAjax(count);
        } else {
            //Upload to server.
            UploadToServer();
        }
    };
    request.send();
}

function SaveMetaData() {
    let title = $('#txt-title').val();
    if (title != '') {
        setTitle(title);
    }
    let author = $('#txt-author').val();
    if (author != '') {
        template['content.opf'] = template['content.opf'].replace('{{AUTHOR}}', author);
    }
    isRTL = $('#sw-rtl').is(':checked');
    if (!isRTL) {
        template['content.opf'] = template['content.opf'].replace(`page-progression-direction="rtl" `, '');
    }
    $('#modal-edit-meta').modal('hide');
}

function UploadToServer() {
    let xml_content_opf = XmlParser.parseFromString(template['content.opf'], "text/xml");
    let xml_toc_ncx = XmlParser.parseFromString(template['toc.ncx'], "text/xml");
    let xml_text_html = XmlParser.parseFromString(template['text.xhtml'], "text/xml");
    var zip = new JSZip();
    var formData = new FormData();
    for (var i = 0, blob; blob = ImageObj[i], i < ImageObj.length; i++) {
        zip.file('OEBPS/Images/image_' + i + '.jpg', blob);
        xml_text_html.getElementsByTagName('img')[0].src = "../Images/image_" + i + ".jpg";
        xml_content_opf.getElementsByTagName('manifest')[0].innerHTML += `<item id="x${i}.jpg" href="Images/image_${i}.jpg" media-type="image/jpg"/>`;
        zip.file('OEBPS/Text/Text_' + i + '.xhtml', xml_serializer.serializeToString(xml_text_html));
        xml_content_opf.getElementsByTagName('manifest')[0].innerHTML += `<item id="Text_${i}.xhtml" href="Text/Text_${i}.xhtml" media-type="application/xhtml+xml"/>`;
        if (isRTL) {
            if (i % 2 == 0) {
                xml_content_opf.getElementsByTagName('spine')[0].innerHTML += `<itemref idref="Text_${i}.xhtml" properties="page-spread-right"/>`;
            } else {
                xml_content_opf.getElementsByTagName('spine')[0].innerHTML += `<itemref idref="Text_${i}.xhtml" properties="page-spread-left"/>`;
            }
        } else {
            if (i % 2 == 0) {
                xml_content_opf.getElementsByTagName('spine')[0].innerHTML += `<itemref idref="Text_${i}.xhtml" properties="page-spread-left"/>`;
            } else {
                xml_content_opf.getElementsByTagName('spine')[0].innerHTML += `<itemref idref="Text_${i}.xhtml" properties="page-spread-right"/>`;
            }
        }

    }

    zip.file('META-INF/container.xml', template['container.xml']);
    zip.file('OEBPS/content.opf', xml_serializer.serializeToString(xml_content_opf));
    zip.file('OEBPS/toc.ncx', template['toc.ncx']);
    zip.file('mimetype', 'application/epub+zip');

    zip.generateAsync({ type: "blob" })
        .then(function (blob) {
            saveAs(blob, "hello.epub");
        });

}

function splitImage(pageNum) {
    let img = new Image();
    img.src = ImagesList[pageNum];
    img.onload = function () {
        let canvas = document.createElement('canvas');
        canvas.width = Math.round(img.naturalWidth / 2);
        canvas.height = img.naturalHeight;
        let ctx = canvas.getContext('2d');
        ctx.drawImage(this, Math.round(img.naturalWidth / 2), 0, img.naturalWidth, img.naturalHeight, 0, 0, img.naturalWidth, img.naturalHeight);
        canvas.toBlob(function (blob) {
            if (isRTL) {
                ImagesList[pageNum] = URL.createObjectURL(blob);
            } else {
                ImagesList.splice(pageNum + 1, 0, URL.createObjectURL(blob));
            }
        });
        ctx.drawImage(this, 0, 0);
        canvas.toBlob(function (blob) {
            if (isRTL) {
                ImagesList.splice(pageNum + 1, 0, URL.createObjectURL(blob));
            } else {
                ImagesList[pageNum] = URL.createObjectURL(blob);
            }
            renderListPage();
        });
    }
}

function setCoverPage(pageNum) {
    let temp = ImagesList[pageNum];
    ImagesList[pageNum] = ImagesList[0];
    ImagesList[0] = temp;
    renderListPage();
}

function changeIndex(pageNum) {
    swal({
        title: 'Enter index you wanna change',
        input: 'number',
        inputAttributes: {
            autocapitalize: 'off'
        },
        showCancelButton: true,
        confirmButtonText: 'Submit',
        showLoaderOnConfirm: true,
        preConfirm: (index) => {
            if (index >= 1 && index <= ImagesList.length) {
                return index;
            } else {
                swal.showValidationError(`Please input index from 1 to ${ImagesList.length}`);
            }
        }
    }).then((obj) => {
        index = obj.value - 1;
        if (!obj.dismiss && index != pageNum) {
            let temp = ImagesList[pageNum];
            ImagesList[pageNum] = ImagesList[index];
            ImagesList[index] = temp;
            renderListPage();
        }
    })
}


function renderListPage() {
    if (ImagesList.length == 0) {
        $('#listPage').fadeOut(200, function () {
            $(this).html(`<li>
                <div class="no-image">
                    <img src="no-image.jpg" alt="No image">
                    <p>Add some image!</p>
                </div>
            </li>`).show();
        });
    } else {
        $('#listPage').html('');
    }
    if (isRTL) {
        renderPageRTL();
    } else {
        renderPageLTR();
    }
    //$('[data-toggle="tooltip"]').tooltip();
}

function renderPageRTL() {
    let fullHtml = '';
    for (var i = 0; i < ImagesList.length; i++) {
        let pageHtml, pageId = '';
        (i % 2 == 0) ? pageId = 'right' : pageId = 'left';
        pageHtml = `<div class="page-index">${i + 1}</div>
                        <div class="page-shadow page-shadow-${pageId}"></div>
                        <div class="page-action">
                            <ul>
                                <li><button class="btn-page-action" data-toggle="tooltip" data-placement="top" title="Set cover" onclick="setCoverPage(${i})"><i class="fa fa-image"></i></button></li>
                                <li><button class="btn-page-action" data-toggle="tooltip" data-placement="top" title="Split into 2 page" onclick="splitImage(${i})"><i class="fa fa-cut"></i></button></li>
                                <li><button class="btn-page-action" data-toggle="tooltip" data-placement="top" title="Delete this page" onclick="deletePage(${i})"><i class="fa fa-trash"></i></button></li>
                                <li><button class="btn-page-action" data-toggle="tooltip" data-placement="top" title="Change index" onclick="changeIndex(${i})"><i class="fa fa-pencil"></i></button></li>
                            </ul>
                        </div>
                        <img src="${ImagesList[i]}" width="100%" height="100%">`;
        if (i % 2 == 0) {
            fullHtml += `<li>
                            <div class="page-item-wrapper">
                            <div class="page-item page-item-right">
                                ${pageHtml}
                            </div>`;
            if ((i + 1) == ImagesList.length) {
                fullHtml += `<div class="page-item page-item-left">
                                    <div class="page-shadow page-shadow-left"></div>
                                    </div>
                                </div>
                            </li>`;
                $('#listPage').append($(fullHtml).hide().fadeIn(200));
            }
        } else {
            fullHtml += `<div class="page-item page-item-left">
                                ${pageHtml}
                            </div>
                        </div>
                    </li>`;
            $('#listPage').append($(fullHtml).hide().fadeIn(200));
            fullHtml = '';
        }
    }
}

function renderPageLTR() {
    let fullHtml = '';
    for (var i = 0; i < ImagesList.length; i++) {
        let pageHtml, pageId = '';
        (i % 2 != 0) ? pageId = 'right' : pageId = 'left';
        pageHtml = `<div class="page-index">${i + 1}</div>
                        <div class="page-shadow page-shadow-${pageId}"></div>
                        <div class="page-action">
                            <ul>
                                <li><button class="btn-page-action" data-toggle="tooltip" data-placement="top" title="Set cover" onclick="setCoverPage(${i})"><i class="fa fa-image"></i></button></li>
                                <li><button class="btn-page-action" data-toggle="tooltip" data-placement="top" title="Split into 2 page" onclick="splitImage(${i})"><i class="fa fa-cut"></i></button></li>
                                <li><button class="btn-page-action" data-toggle="tooltip" data-placement="top" title="Delete this page" onclick="deletePage(${i})"><i class="fa fa-trash"></i></button></li>
                                <li><button class="btn-page-action" data-toggle="tooltip" data-placement="top" title="Change index" onclick="changeIndex(${i})"><i class="fa fa-pencil"></i></button></li>
                            </ul>
                        </div>
                        <img src="${ImagesList[i]}" width="100%" height="100%">`;
        if (i % 2 == 0) {
            fullHtml += `<li>
                            <div class="page-item-wrapper">
                            <div class="page-item page-item-left">
                                ${pageHtml}
                            </div>`;
            if ((i + 1) == ImagesList.length) {
                fullHtml += `<div class="page-item page-item-left">
                                    <div class="page-shadow page-shadow-right"></div>
                                    </div>
                                </div>
                            </li>`;
                $('#listPage').append($(fullHtml).hide().fadeIn(200));
            }
        } else {
            fullHtml += `<div class="page-item page-item-right">
                                ${pageHtml}
                            </div>
                        </div>
                    </li>`;
            $('#listPage').append($(fullHtml).hide().fadeIn(200));
            fullHtml = '';
        }
    }
}