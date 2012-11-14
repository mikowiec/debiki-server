/**
 * Copyright (c) 2012 Kaj Magnus Lindberg (born 1979)
 */

package debiki

import com.debiki.v0._
import controllers._
import java.{util => ju}
import scala.xml.NodeSeq
import EmailNotfPrefs.EmailNotfPrefs
import Prelude._


trait RenderedPageHtmlDao {
  this: TenantDao =>

  def renderTemplate(pageReq: PageRequest[_], appendToBody: NodeSeq = Nil)
        : String =
    TemplateRenderer(pageReq, None, appendToBody).renderTemplate()

}



trait CachingRenderedPageHtmlDao extends RenderedPageHtmlDao {
  self: TenantDao =>

  override def renderTemplate(pageReq: PageRequest[_],
        appendToBody: NodeSeq = Nil): String = {
    // Bypass the cache if the page doesn't yet exist (it's being created),
    // because in the past there was some error because non-existing pages
    // had no ids (so feels safer to bypass).
    val cache = if (pageReq.pageExists) Some(Debiki.PageCache) else None
    TemplateRenderer(pageReq, cache, appendToBody).renderTemplate()
  }


  def uncacheRenderedPageHtml(pageId: String, host: String) {
    Debiki.PageCache.refreshLater(tenantId = tenantId, pageId = pageId,
      host = host)
  }

}
